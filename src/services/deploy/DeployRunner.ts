import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { DeployableAgentFromAuth, RemoteAuthAgentDeployableFiles } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { unwrapError } from "@/lib/errors/errors";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { AnyDeployBundle, DeployBundle, DeployBundleFactory } from "@/services/deploy/DeployBundle";
import { useSyncExternalStore } from "react";

type DeployLogType = DeployLogLine["type"];
function logLine(message: string, type: DeployLogType = "info") {
  return {
    timestamp: Date.now(),
    message,
    type,
  } as DeployLogLine;
}

export type DeployLogLine = {
  timestamp: number;
  message: string;
  type: "info" | "error";
};

export class DeployRunner<
  TBundle extends DeployBundle<TFile>,
  TFile extends { path?: string } = TBundle extends DeployBundle<infer U> ? U : unknown,
> {
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle, TFile>;
  private bundle: TBundle;
  private abortController: AbortController = new AbortController();

  emitter = CreateSuperTypedEmitter<{
    log: DeployLogLine;
    complete: boolean;
    update: DeployDAO;
  }>();
  constructor({
    agent,
    destination,
    deploy,
    bundle,
  }: {
    agent: RemoteAuthAgentDeployableFiles<TBundle, TFile>;
    destination: DestinationDAO;
    deploy: DeployDAO;
    bundle: TBundle;
  }) {
    this.agent = agent;
    this.destination = destination;
    this.deploy = deploy;
    this.bundle = bundle;
  }

  get isDeploying() {
    return this.deploy.status === "pending";
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

  static Create({
    build,
    destination,
    workspaceId,
    label,
  }: {
    build: BuildDAO;
    destination: DestinationDAO;
    workspaceId: string;
    label: string;
  }) {
    return new AnyDeployRunner({
      destination,
      deploy: DeployDAO.CreateNew({
        label,
        workspaceId,
        meta: {},
        buildId: build.guid,
        destinationId: destination.guid,
      }),
      agent: DeployableAgentFromAuth(destination.RemoteAuth),
      bundle: DeployBundleFactory(build, destination),
    });
  }

  onLog = (callback: (log: DeployLogLine) => void) => {
    return this.emitter.on("log", callback);
  };
  getLogs = () => this.deploy.logs;

  onComplete = (callback: (complete: boolean) => void) => {
    return this.emitter.on("complete", callback);
  };
  getComplete = () => this.isCompleted;

  tearDown() {
    this.emitter.clearListeners();
  }

  cancel() {
    this.abortController.abort();
    this.log("Deployment cancelled by user", "error");
  }

  protected readonly log = (message: string, type?: DeployLogType) => {
    const line = logLine(message, type);
    this.deploy.logs = [...this.deploy.logs, line];
    this.emitter.emit("log", line);
    return line;
  };

  async execute({
    abortSignal = this.abortController.signal,
    log = () => {},
  }: {
    log?: (l: DeployLogLine) => void;
    abortSignal?: AbortSignal;
  } = {}): Promise<DeployDAO> {
    const errorLog = (message: string) => log(this.log(message, "error"));
    const infoLog = (message: string) => log(this.log(message, "info"));

    try {
      this.deploy.status = "pending";
      await this.deploy.save();
      this.emitter.emit("update", this.deploy);

      if (abortSignal?.aborted) {
        errorLog("Deployment cancelled");
        return this.deploy.update({
          logs: this.deploy.logs,
          status: "cancelled",
        });
      }

      infoLog(`Starting deployment, id ${this.deploy.guid}...`);
      infoLog(`Destination: ${this.destination.label}`);

      await this.agent.deployFiles(this.bundle, this.destination, (status: string) => {
        if (abortSignal?.aborted) {
          throw new Error("Deployment cancelled");
        }
        this.log(status);
      });

      if (abortSignal?.aborted) {
        return this.deploy.update({
          logs: this.deploy.logs,
          status: "cancelled",
        });
      }

      this.deploy.status = "success";
      this.deploy.completedAt = Date.now();
      infoLog("Deployment completed successfully.");

      return await this.deploy.update({
        logs: this.deploy.logs,
        status: "success",
        completedAt: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Deployment failed:", error);
      errorLog(`Deployment failed: ${errorMessage}`);
      if (!abortSignal?.aborted) {
        this.deploy.status = "failed";
        this.emitter.emit("update", this.deploy);
        return await this.deploy.update({
          logs: this.deploy.logs,
          status: "failed",
        });
      } else {
        this.deploy.status = "cancelled";
        this.emitter.emit("update", this.deploy);
        return await this.deploy.update({
          logs: this.deploy.logs,
          status: "cancelled",
        });
      }
    } finally {
      this.emitter.emit("complete", this.isCompleted);
      this.emitter.emit("update", this.deploy);
    }
  }
}

export function useDeployRunnerLogs(runner: DeployRunner<any, any>) {
  return useSyncExternalStore(runner.onLog, runner.getLogs);
}

export class AnyDeployRunner<TBundle extends DeployBundle<any>> extends DeployRunner<TBundle> {}

export class NullDeployRunner extends DeployRunner<AnyDeployBundle> {
  constructor() {
    super({
      agent: {} as RemoteAuthAgentDeployableFiles<AnyDeployBundle>,
      destination: {} as DestinationDAO,
      deploy: {} as DeployDAO,
      bundle: {} as AnyDeployBundle,
    });
  }

  async execute(): Promise<DeployDAO> {
    return this.deploy;
  }
}
