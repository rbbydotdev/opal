import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { DeployBundle } from "@/services/deploy/DeployBundle";
import { RemoteAuthDAO, VercelRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";

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

export abstract class DeployRunner {
  readonly build: BuildDAO;
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly remoteAuth: RemoteAuthDAO;

  emitter = CreateSuperTypedEmitter<{
    log: DeployLogLine;
    complete: boolean;
    update: DeployDAO;
  }>();
  constructor({
    remoteAuth,
    build,
    destination,
    deploy,
  }: {
    remoteAuth: RemoteAuthDAO;
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
  }) {
    this.remoteAuth = remoteAuth;
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

  abstract runDeploy(): Promise<void>;
}

export class VercelDeployRunner extends DeployRunner {
  constructor(params: {
    remoteAuth: VercelRemoteAuthDAO;
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
  }) {
    super(params);
  }
  async runDeploy(): Promise<void> {
    this.log("Starting deployment...");
    await this.build.Disk.refresh();
    const deployBundle = DeployBundle.FromBuild(this.build);
    const files = await deployBundle.getDeployBundleFiles();
    this.log("Deployment completed successfully.");
  }
}
