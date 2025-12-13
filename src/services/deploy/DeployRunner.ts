import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { DeployableAgentFromAuth, RemoteAuthAgentDeployableFiles } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { unwrapError } from "@/lib/errors/errors";
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

export class DeployRunner<
  TBundle extends DeployBundle<TFile>,
  TFile extends { path?: string } = TBundle extends DeployBundle<infer U> ? U : unknown,
> {
  readonly destination: DestinationDAO;
  readonly deploy: DeployDAO;
  readonly agent: RemoteAuthAgentDeployableFiles<TBundle, TFile>;
  private bundle: TBundle;

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
      bundle: new AnyDeployBundle(build),
    });
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

  async runDeploy(): Promise<void> {
    try {
      this.deploy.status = "pending";
      this.emitter.emit("update", this.deploy);
      
      await this.agent.deployFiles(
        this.bundle, 
        this.destination, 
        (status: string) => {
          this.log(status);
        }
      );
      
      this.deploy.status = "success";
      this.emitter.emit("update", this.deploy);
    } catch (e) {
      this.deploy.status = "failed";
      this.log(`Deployment failed: ${unwrapError(e)}`, "error");
      this.emitter.emit("update", this.deploy);
      throw e;
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

  async runDeploy(): Promise<void> {}
}
