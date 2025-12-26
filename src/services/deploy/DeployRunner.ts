import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO, NULL_DEPLOY } from "@/data/dao/DeployDAO";
import { DestinationDAO, NULL_DESTINATION } from "@/data/dao/DestinationDAO";
import {
  DeployableAuthAgentFromRemoteAuth,
  RemoteAuthAgentDeployableFiles,
} from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { NULL_REMOTE_AUTH_AGENT } from "@/data/remote-auth/RemoteAuthNullAgent";
import { unwrapError } from "@/lib/errors/errors";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { DeployBundle, DeployBundleBase, DeployBundleFactory, NULL_BUNDLE } from "@/services/deploy/DeployBundle";
import { Runner } from "@/types/RunnerInterfaces";

export class DeployRunner<TBundle extends DeployBundleBase> extends ObservableRunner<DeployDAO> implements Runner {
  readonly destination: DestinationDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle>;
  private bundle: TBundle;
  protected abortController: AbortController = new AbortController();

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
    super(deploy);
    this.agent = agent;
    this.destination = destination;
    this.bundle = bundle;
  }

  static Show({
    destination,
    deploy,
  }: {
    destination: DestinationDAO | null;
    deploy: DeployDAO | null;
  }): DeployRunner<DeployBundle> {
    return new DeployRunner({
      bundle: {} as DeployBundle,
      agent: {} as RemoteAuthAgentDeployableFiles<DeployBundle>,
      destination: destination || NULL_DESTINATION,
      deploy: deploy || NULL_DEPLOY,
    });
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

  static New({
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
      this.target.status = "pending";

      abortSignal?.throwIfAborted();

      this.log(`Starting deployment, id ${this.target.guid}...`, "info");
      this.log(`Destination: ${this.target.label}`, "info");

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

      this.target.url = destinationUrl;
      this.target.deploymentUrl = deploymentUrl;
      this.target.status = "success";
    } catch (error) {
      const errorMessage = unwrapError(error);
      console.error("Deployment failed:", error);
      this.log(`Deployment failed: ${errorMessage}`, "error");
      this.target.error = abortSignal?.aborted ? `Deployment cancelled` : `Deployment failed: ${errorMessage}`;
      this.target.status = "error";
    } finally {
      this.target.completedAt = Date.now();
      await this.target.save();
      return this.target.hydrate();
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
    return this.target;
  }
}

export const NULL_DEPLOY_RUNNER = new NullDeployRunner();
