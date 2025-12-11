import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { DeployableAgentFromAuth } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
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
    destination,
    deploy,
  }: {
    agent: RemoteAuthAgentDeployableFiles<TBundle, TParams, TFile>;
    destination: DestinationDAO;
    deploy: DeployDAO;
  }) {
    this.agent = agent;
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

export class AnyDeployRunner<TBundle extends DeployBundle<any>, TParams = any> extends DeployRunner<TBundle, TParams> {
  private bundle: TBundle;

  constructor(params: {
    destination: DestinationDAO;
    deploy: DeployDAO;
    agent: RemoteAuthAgentDeployableFiles<TBundle, TParams>;
    bundle: TBundle;
  }) {
    super(params);
    this.bundle = params.bundle;
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
        data: {},
        buildId: build.guid,
        destinationId: destination.guid,
      }),
      agent: DeployableAgentFromAuth(destination.RemoteAuth),
      bundle: new AnyDeployBundle(build),
    });
  }

  async runDeploy(params: TParams): Promise<void> {
    this.log("Starting deployment...");
    let files = 0;
    await this.agent.deployFiles(this.bundle, params, (deployedFile) => {
      this.log(`Deployed file (${++files}): ${deployedFile.path}`);
    });
    this.log("Deployment completed successfully.");
  }
}

export class NullDeployRunner extends DeployRunner<AnyDeployBundle, any> {
  constructor() {
    super({
      agent: {} as RemoteAuthAgentDeployableFiles<AnyDeployBundle, any>,
      destination: {} as DestinationDAO,
      deploy: {} as DeployDAO,
    });
  }

  async runDeploy(_params: any): Promise<void> {}
}
