import { GithubInlinedFile } from "@/api/github/GitHubClient";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { RemoteAuthAgentDeployableFiles } from "@/data/RemoteSearchFuzzyCache";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { AnyDeployBundle, DeployBundle } from "@/services/deploy/DeployBundle";

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

export abstract class DeployRunner<TBundle extends DeployBundle<unknown>, TParams> {
  readonly build: BuildDAO;
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle, TParams>;

  emitter = CreateSuperTypedEmitter<{
    log: DeployLogLine;
    complete: boolean;
    update: DeployDAO;
  }>();
  constructor({
    agent,
    build,
    destination,
    deploy,
  }: {
    agent: RemoteAuthAgentDeployableFiles<TBundle, TParams>;
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
  }) {
    this.agent = agent;
    this.build = build;
    this.destination = destination;
    this.deploy = deploy;
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

  protected readonly log = (message: string, type?: DeployLogType) => {
    const line = logLine(message, type);
    this.deploy.logs = [...this.deploy.logs, line];
    this.emitter.emit("log", line);
    return line;
  };

  abstract runDeploy(params: TParams): Promise<void>;
}

// export class GithubDeployRunner extends DeployRunner<DeployBundle<any>, { owner: string; repo: string; branch: string; message?: string }> {
//   private bundle: TBundle;
//   async runDeploy(params: { owner: string; repo: string; branch: string; message?: string }): Promise<void> {
//     this.log("Starting deployment...");
//     await this.build.Disk.refresh();
//     await this.agent.deployFiles(this.bundle, params);
//     this.log("Deployment completed successfully.");
//   }
// }

export class GithubDeployRunner extends DeployRunner<
  DeployBundle<GithubInlinedFile>,
  { repotName: string; repoOwner: string }
> {
  constructor(params: {
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
    agent: RemoteAuthAgentDeployableFiles<any, { repotName: string; repoOwner: string }>;
  }) {
    super(params);
  }
  async runDeploy(params: { repotName: string; repoOwner: string }): Promise<void> {
    this.log("Starting deployment...");
    await this.build.Disk.refresh();
    const deployBundle = new AnyDeployBundle(this.build.getSourceDisk(), this.build.getBuildPath());
    await this.agent.deployFiles(deployBundle as any, params);
    throw new Error("Method not implemented.^^^^^^^^ any fix ");
    this.log("Deployment completed successfully.");
  }
}

export class AnyDeployRunner<TBundle extends DeployBundle<any>, TParams> extends DeployRunner<TBundle, TParams> {
  private bundle: TBundle;

  constructor(params: {
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
    agent: RemoteAuthAgentDeployableFiles<TBundle, TParams>;
    bundle: TBundle;
  }) {
    super(params);
    this.bundle = params.bundle;
  }

  async runDeploy(params: TParams): Promise<void> {
    this.log("Starting deployment...");
    await this.build.Disk.refresh();
    await this.agent.deployFiles(this.bundle, params);
    this.log("Deployment completed successfully.");
  }
}

// export interface VercelRemoteAuthAgentDeployable
//   extends RemoteAuthAgentDeployableFiles<DeployBundle<InlinedFile>, { projectName: string }> {}

// export interface GithubRemoteAuthAgentDeployable
//   extends RemoteAuthAgentDeployableFiles<
//     DeployBundle<GithubInlinedFile>,
//     {
//       owner: string;
//       repo: string;
//       branch: string;
//       message: string;
//       files: GithubInlinedFile[];
//     }
//   > {}

// export class VercelDeployRunner extends DeployRunner<DeployBundle<InlinedFile>, { projectName: string }> {
//   constructor(params: {
//     build: BuildDAO;
//     destination: DestinationDAO;
//     deploy: DeployDAO;
//     agent: VercelRemoteAuthAgentDeployable;
//   }) {
//     super(params);
//   }
//   async runDeploy(params: { projectName: string }): Promise<void> {
//     this.log("Starting deployment...");
//     await this.build.Disk.refresh();
//     const deployBundle = new VercelDeployBundle(this.build.getSourceDisk(), this.build.getBuildPath());
//     await this.agent.deployFiles(deployBundle, params);
//     this.log("Deployment completed successfully.");
//   }
// }
