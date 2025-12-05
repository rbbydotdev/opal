import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { RemoteAuthAgentDeployable } from "@/data/RemoteSearchFuzzyCache";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { AnyDeployBundle, DeployBundle, VercelDeployBundle } from "@/services/deploy/DeployBundle";
import { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";

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
  readonly agent: RemoteAuthAgentDeployable<TBundle, TParams>;

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
    agent: RemoteAuthAgentDeployable<TBundle, TParams>;
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
    const l = logLine(message, type);
    this.deploy.logs = [...this.deploy.logs, l];
    this.emitter.emit("log", l);
    return l;
  };

  abstract runDeploy(params: TParams): Promise<void>;
}

export interface VercelRemoteAuthAgentDeployable
  extends RemoteAuthAgentDeployable<DeployBundle<InlinedFile>, { projectName: string }> {}

export class VercelDeployRunner extends DeployRunner<DeployBundle<InlinedFile>, { projectName: string }> {
  constructor(params: {
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
    agent: RemoteAuthAgentDeployable<DeployBundle<InlinedFile>, { projectName: string }>;
  }) {
    super(params);
  }
  async runDeploy(params: { projectName: string }): Promise<void> {
    this.log("Starting deployment...");
    await this.build.Disk.refresh();
    const deployBundle = new VercelDeployBundle(this.build.getSourceDisk(), this.build.getBuildPath());
    await this.agent.deploy(deployBundle, params);
    this.log("Deployment completed successfully.");
  }
}

export class AnyDeployRunner<T extends AnyDeployBundle, P = unknown> extends DeployRunner<T, P> {
  constructor(params: {
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
    agent: RemoteAuthAgentDeployable<T, P>;
  }) {
    super(params);
  }
  async runDeploy(params: P): Promise<void> {
    this.log("Starting deployment...");
    await this.build.Disk.refresh();
    const deployBundle = new AnyDeployBundle(this.build.getSourceDisk(), this.build.getBuildPath());
    await this.agent.deploy(deployBundle, params);
    this.log("Deployment completed successfully.");
  }
}
