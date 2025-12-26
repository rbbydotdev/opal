import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO, NULL_DEPLOY } from "@/data/dao/DeployDAO";
import { DestinationDAO, NULL_DESTINATION } from "@/data/dao/DestinationDAO";
import {
  DeployableAuthAgentFromRemoteAuth,
  RemoteAuthAgentDeployableFiles,
} from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { NULL_REMOTE_AUTH_AGENT } from "@/data/remote-auth/RemoteAuthNullAgent";
import { unwrapError } from "@/lib/errors/errors";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { observeMultiple } from "@/lib/Observable";
import { DeployBundle, DeployBundleBase, DeployBundleFactory, NULL_BUNDLE } from "@/services/deploy/DeployBundle";
import { Runner } from "@/types/RunnerInterfaces";
import { LogLine } from "@/types/RunnerTypes";

export class DeployRunner<TBundle extends DeployBundleBase> implements Runner {
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle>;
  private bundle: TBundle;

  emitter = CreateSuperTypedEmitter<{
    logs: LogLine[];
    status: "success" | "pending" | "error" | "idle";
  }>();

  tearDown(): void {
    this.emitter.clearListeners();
  }
  get logs() {
    return this.deploy.logs;
  }
  get status() {
    return this.deploy.status;
  }
  get error() {
    return this.deploy.error;
  }

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
    this.agent = agent;
    this.destination = destination;
    // Wrap deploy with Observable to automatically broadcast status changes
    this.deploy = observeMultiple(
      deploy,
      {
        status: this.broadcastUpdate,
        logs: this.broadcastUpdate,
      },
      {
        batch: true,
      }
    );
    this.bundle = bundle;
  }

  get status() {
    return this.deploy.status;
  }

  get isDeploying() {
    return this.deploy.status === "pending";
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

  cancel() {
    this.abortController.abort();
    this.log("Deployment cancelled by user", "error");
  }

  async execute({
    abortSignal = this.abortController.signal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<DeployDAO> {
    try {
      this.deploy.status = "pending";

      abortSignal?.throwIfAborted();

      this.log(`Starting deployment, id ${this.deploy.guid}...`, "info");
      this.log(`Destination: ${this.destination.label}`, "info");

      await this.agent.deployFiles(
        this.bundle,
        this.destination,
        (status: string) => this.log(status, "info"),
        abortSignal
      );

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

      this.deploy.url = destinationUrl;
      this.deploy.deploymentUrl = deploymentUrl;
      this.deploy.status = "success";
    } catch (error) {
      const errorMessage = unwrapError(error);
      console.error("Deployment failed:", error);
      this.log(`Deployment failed: ${errorMessage}`, "error");
      this.deploy.error = abortSignal?.aborted ? `Deployment cancelled` : `Deployment failed: ${errorMessage}`;
      this.deploy.status = "error";
    } finally {
      this.deploy.completedAt = Date.now();
      await this.deploy.save();
      return this.deploy.hydrate();
    }
  }
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
