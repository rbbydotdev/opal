import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { RemoteAuthAgentDeployableFiles } from "@/data/RemoteSearchFuzzyCache";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { AnyDeployBundle, DeployBundle } from "@/services/deploy/DeployBundle";
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

export abstract class DeployRunner<
  TBundle extends DeployBundle<TFile>,
  TParams,
  TFile = TBundle extends DeployBundle<infer U> ? U : unknown,
> {
  readonly build: BuildDAO;
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle, TParams, TFile>;

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
    agent: RemoteAuthAgentDeployableFiles<TBundle, TParams, TFile>;
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

  onLog = (callback: (log: DeployLogLine) => void) => {
    return this.emitter.on("log", callback);
  };
  getLogs = () => this.deploy.logs;

  protected readonly log = (message: string, type?: DeployLogType) => {
    const line = logLine(message, type);
    this.deploy.logs = [...this.deploy.logs, line];
    this.emitter.emit("log", line);
    return line;
  };

  abstract runDeploy(params: TParams): Promise<void>;
}

export function useDeployRunnerLogs(runner: DeployRunner<any, any, any>) {
  return useSyncExternalStore(runner.onLog, runner.getLogs);
}

export class GithubDeployRunner extends DeployRunner<AnyDeployBundle, { repoName: string; repoOwner: string }> {
  constructor(params: {
    build: BuildDAO;
    destination: DestinationDAO;
    deploy: DeployDAO;
    agent: RemoteAuthAgentDeployableFiles<AnyDeployBundle, { repoName: string; repoOwner: string }>;
  }) {
    super(params);
  }
  async runDeploy(params: { repoName: string; repoOwner: string }): Promise<void> {
    this.log("Starting deployment...");
    await this.build.Disk.refresh();
    const deployBundle = new AnyDeployBundle(this.build.getSourceDisk(), this.build.getBuildPath());
    let files = 0;
    await this.agent.deployFiles(deployBundle, params, (deployedFile) => {
      this.log(`Deployed file (${++files}): ${deployedFile.path}`);
    });
    this.log("Deployment completed successfully.");
  }
}

export class AnyDeployRunner<TBundle extends DeployBundle<any>, TParams = any> extends DeployRunner<TBundle, TParams> {
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
