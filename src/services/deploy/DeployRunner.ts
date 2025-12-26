import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO, NULL_DEPLOY } from "@/data/dao/DeployDAO";
import { DeployLogLine as OriginalDeployLogLine } from "@/data/dao/DeployRecord";
import { DestinationDAO, NULL_DESTINATION } from "@/data/dao/DestinationDAO";
import {
  DeployableAuthAgentFromRemoteAuth,
  RemoteAuthAgentDeployableFiles,
} from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { NULL_REMOTE_AUTH_AGENT } from "@/data/remote-auth/RemoteAuthNullAgent";
import { DeployBundle, DeployBundleBase, DeployBundleFactory, NULL_BUNDLE } from "@/services/deploy/DeployBundle";
import { BaseRunner } from "@/services/runners/BaseRunner";
import { RunnerLogLine, RunnerLogType } from "@/types/RunnerTypes";
import { useSyncExternalStore } from "react";

export type DeployLogLine = OriginalDeployLogLine;

export class DeployRunner<TBundle extends DeployBundleBase> extends BaseRunner {
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle>;
  private bundle: TBundle;
  kind = "deploy-runner";

  constructor({
    agent,
    destination,
    deploy,
    bundle,
  }: {
    agent: RemoteAuthAgentDeployableFiles<TBundle>;
    destination: DestinationDAO;
    deploy: DeployDAO;
    bundle: TBundle;
  }) {
    super();
    this.agent = agent;
    this.destination = destination;
    this.deploy = deploy;
    this.bundle = bundle;
  }

  get isDeploying() {
    return this.deploy.status === "pending";
  }

  // Override logs to get from deploy DAO instead of internal state
  get logs(): RunnerLogLine[] {
    return this.deploy.logs.map((log) => ({
      timestamp: log.timestamp,
      message: log.message,
      type: log.type === "success" || log.type === "warning" ? "info" : log.type,
    }));
  }

  // Override completed to use deploy status
  get completed(): boolean {
    return this.deploy.status === "success" || this.deploy.status === "failed" || this.deploy.status === "cancelled";
  }

  // Override running to use deploy status
  get running(): boolean {
    return this.deploy.status === "pending";
  }

  // Implement Runner interface error property
  get error(): string | null {
    return this.deploy.status === "failed" ? "Deployment failed" : null;
  }

  get isCompleted() {
    return this.deploy.status === "success" || this.deploy.status === "failed" || this.deploy.status === "cancelled";
  }
  get isSuccessful() {
    return this.deploy.status === "success";
  }
  get isCancelled() {
    return this.deploy.status === "cancelled";
  }
  get isFailed() {
    return this.deploy.status === "failed";
  }
  get isIdle() {
    return this.deploy.status === "idle";
  }

  static async Recall({ deployId }: { deployId: string }): Promise<DeployRunner<DeployBundle>> {
    const deploy = await DeployDAO.FetchFromGuid(deployId);
    if (!deploy) throw new Error(`Deploy with ID ${deployId} not found`);
    const destination = await DestinationDAO.FetchDAOFromGuid(deploy.destinationId, true);
    return new DeployRunner({
      bundle: {} as DeployBundle,
      agent: {} as RemoteAuthAgentDeployableFiles<DeployBundle>,
      destination,
      deploy,
    });
  }

  static Create({
    build,
    deploy,
    destination,
    workspaceId,
    label,
  }: {
    build: BuildDAO;
    deploy: DeployDAO | null;
    destination: DestinationDAO;
    workspaceId: string;
    label: string;
  }): DeployRunner<DeployBundle> {
    if (!destination.RemoteAuth) {
      return new NullDeployRunner();
    }
    return new AnyDeployRunner({
      destination,
      deploy:
        deploy ||
        DeployDAO.CreateNew({
          label,
          provider: destination.provider,
          workspaceId,
          meta: {},
          buildId: build.guid,
          destinationId: destination.guid,
        }),
      agent: DeployableAuthAgentFromRemoteAuth(destination.RemoteAuth),

      bundle: DeployBundleFactory(build, destination),
    });
  }

  // Override getRunner to return DeployRunner instead of generic Runner
  getRunner = (): DeployRunner<TBundle> => this;

  onDeploy = (callback: (deploy: DeployDAO) => void) => {
    return this.onUpdate((runner) => callback((runner as DeployRunner<TBundle>).deploy));
  };
  getDeploy = () => this.deploy;

  cancel() {
    this.abortController.abort();
    this.log("Deployment cancelled by user", "error");
  }

  // Override log to also store in deploy DAO
  protected log = (message: string, type?: RunnerLogType) => {
    const logLine = super["log"](message, type);
    this.deploy.logs = [...this.deploy.logs, logLine as DeployLogLine];
    return logLine;
  };

  async execute({
    abortSignal = this.abortController.signal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<DeployDAO> {
    try {
      this.deploy.status = "pending";
      // i want to proxy this this.broadcastStatus();

      if (abortSignal?.aborted) {
        this.log("Deployment cancelled", "error");
        this.deploy.status = "cancelled";
      }

      this.log(`Starting deployment, id ${this.deploy.guid}...`, "info");
      this.log(`Destination: ${this.destination.label}`, "info");

      await this.agent.deployFiles(this.bundle, this.destination, (status: string) => {
        if (abortSignal?.aborted) {
          throw new Error("Deployment cancelled");
        }
        this.log(status, "info");
      });

      if (abortSignal?.aborted) {
        return this.deploy.update({
          logs: this.deploy.logs,
          status: "cancelled",
        });
      }

      this.log("Deployment completed successfully.", "info");

      // Get the destination URL (main app URL)
      const destinationUrl = await this.agent.getDestinationURL(this.destination);

      // For deployment-specific URLs, check if agent provides one, otherwise fallback to destination URL
      const deploymentUrl =
        typeof this.agent.getDeploymentURL === "function"
          ? await this.agent.getDeploymentURL(this.destination)
          : destinationUrl;

      // Update destination with main URL if not already set
      if (!this.destination.destinationUrl && destinationUrl) {
        await this.destination.update({ destinationUrl });
      }

      return await this.deploy.update({
        logs: this.deploy.logs,
        status: "success",
        completedAt: Date.now(),
        url: destinationUrl, // Keep for backward compatibility
        deploymentUrl: deploymentUrl,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Deployment failed:", error);
      this.log(`Deployment failed: ${errorMessage}`, "error");
      this.setError(`Deployment failed: ${errorMessage}`);
      if (!abortSignal?.aborted) {
        return await this.deploy.update({
          logs: this.deploy.logs,
          status: "failed",
        });
      } else {
        return await this.deploy.update({
          logs: this.deploy.logs,
          status: "cancelled",
        });
      }
    } finally {
      await this.deploy.save();
    }
  }
}

export function useDeployRunnerLogs(runner: DeployRunner<any>) {
  return useSyncExternalStore(runner.onUpdate, () => runner.logs);
}

export class AnyDeployRunner<TBundle extends DeployBundleBase<any>> extends DeployRunner<TBundle> {}

export class NullDeployRunner extends DeployRunner<DeployBundle> {
  constructor() {
    super({
      agent: NULL_REMOTE_AUTH_AGENT,
      destination: NULL_DESTINATION,
      deploy: NULL_DEPLOY,
      bundle: NULL_BUNDLE,
    });
  }

  async execute(): Promise<DeployDAO> {
    return this.deploy;
  }
}
