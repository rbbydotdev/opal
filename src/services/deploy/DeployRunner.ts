import { BuildDAO } from "@/data/BuildDAO";
import { DeployDAO, NULL_DEPLOY } from "@/data/DeployDAO";
import { DeployLogLine } from "@/data/DeployRecord";
import { Disk } from "@/data/disk/Disk";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { AbsPath } from "@/lib/paths2";
import { CreateSuperTypedEmitter } from "@/lib/TypeEmitter";
import { BaseDeployData } from "./DeployTypes";

export interface DeployRunnerOptions<T = BaseDeployData> {
  deploy: DeployDAO<T>;
  build: BuildDAO;
  destination: RemoteAuthAgent;
  destinationType?: "cloudflare" | "netlify" | "github" | "vercel" | "aws";
  destinationName?: string;
  deployLabel?: string;
  data: T;
  abortSignal?: AbortSignal;
  onLog?: (message: string) => void;
  onError?: (message: string) => void;
}

export interface DeployResult<T = BaseDeployData> {
  success: boolean;
  data?: T;
  error?: string;
}

export type DeployLogType = "info" | "error" | "warning" | "success";

function logLine(message: string, type: DeployLogType = "info") {
  return {
    timestamp: Date.now(),
    message,
    type,
  } as DeployLogLine;
}

export abstract class DeployRunner<T = BaseDeployData> {
  deploy: DeployDAO<T>;
  get completed() {
    return this.deploy.completed;
  }

  emitter = CreateSuperTypedEmitter<{
    log: DeployLogLine;
    complete: boolean;
    update: DeployDAO<T>;
  }>();

  get build(): BuildDAO {
    return this.options.build;
  }

  get destination(): RemoteAuthAgent {
    return this.options.destination;
  }

  get buildDisk(): Disk {
    return this.build.getSourceDisk();
  }

  get buildOutputPath(): AbsPath {
    return this.build.getOutputPath();
  }

  get logs(): DeployLogLine[] {
    return this.deploy.logs;
  }

  get data(): T {
    return this.deploy.data;
  }

  get isDeploying(): boolean {
    return this.deploy.status === "pending";
  }

  get isCompleted(): boolean {
    return this.deploy.completed;
  }

  get isSuccessful(): boolean {
    return this.deploy.isSuccessful;
  }

  get isFailed(): boolean {
    return this.deploy.isFailed;
  }

  get isCancelled(): boolean {
    return this.deploy.isCancelled;
  }

  get isIdle(): boolean {
    return this.deploy.isIdle;
  }

  get deployId() {
    return this.deploy.guid;
  }

  private abortController: AbortController = new AbortController();

  constructor(protected options: DeployRunnerOptions<T>) {
    this.deploy = options.deploy || this.createNewDeploy();
  }

  private createNewDeploy(): DeployDAO<T> {
    if (!this.options.build || !this.options.destinationType || !this.options.destinationName) {
      throw new Error("Missing required options for new deployment");
    }

    return DeployDAO.CreateNew<T>({
      label: this.options.deployLabel || `Deploy ${new Date().toLocaleString()}`,
      buildId: this.options.build.guid,
      workspaceId: this.options.build.workspaceId,
      destinationType: this.options.destinationType,
      destinationName: this.options.destinationName,
      data: this.options.data || ({} as T),
    });
  }

  static async recall<T = BaseDeployData>({ deployId }: { deployId: string }): Promise<DeployRunner<T>> {
    const deploy = await DeployDAO.FetchFromGuid<T>(deployId);
    if (!deploy) throw new Error(`Deploy with ID ${deployId} not found`);

    // Note: This would need to be implemented per provider to return the right runner type
    throw new Error("DeployRunner.recall() must be implemented by concrete classes");
  }

  static create<T = BaseDeployData>({ deploy }: { deploy: DeployDAO<T> }): DeployRunner<T> {
    // Note: This would need to be implemented per provider to return the right runner type
    throw new Error("DeployRunner.create() must be implemented by concrete classes");
  }

  protected log = (message: string, type: DeployLogType = "info"): DeployLogLine => {
    const l = logLine(message, type);
    this.deploy.logs = [...this.deploy.logs, l];
    this.emitter.emit("log", l);
    this.options.onLog?.(message);
    if (type === "error") {
      this.options.onError?.(message);
    }
    return l;
  };

  onLog = (callback: (log: DeployLogLine) => void) => {
    return this.emitter.on("log", callback);
  };

  getLogs = (): DeployLogLine[] => this.logs;

  onComplete = (callback: (complete: boolean) => void) => {
    return this.emitter.on("complete", callback);
  };

  getComplete = (): boolean => this.isCompleted;

  cancel(): void {
    if (!this.isDeploying) return;
    this.abortController.abort();
    this.log("Deploy cancelled by user", "error");
  }

  tearDown(): void {
    this.emitter.clearListeners();
  }

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

      infoLog(`Starting deployment, id ${this.deploy.guid}...`);
      infoLog(`Build ID: ${this.deploy.buildId}`);
      infoLog(`Destination: ${this.getDestinationName()}`);

      if (abortSignal?.aborted) {
        errorLog("Deployment cancelled");
        return this.deploy.update({
          logs: this.logs,
          status: "cancelled",
        });
      }

      // Get the build
      const build = this.deploy.buildId ? await BuildDAO.FetchFromGuid(this.deploy.buildId) : null;
      if (!build || build.status !== "success") {
        throw new Error("Cannot deploy failed or missing build");
      }

      if (this.destination) {
        // Test destination connectivity
        infoLog("Testing destination connectivity...");
        const testResult = await this.destination.test();
        if (testResult.status === "error") {
          throw new Error(`Destination test failed: ${testResult.msg}`);
        }
        infoLog("Destination connectivity test passed");
      }

      if (abortSignal?.aborted) {
        errorLog("Deployment cancelled");
        return this.deploy.update({
          logs: this.logs,
          status: "cancelled",
        });
      }

      // Perform the deployment
      infoLog("Starting deployment process...");
      const result = await this.performDeploy();

      if (abortSignal?.aborted) {
        return this.deploy.update({
          logs: this.logs,
          status: "cancelled",
        });
      }

      if (result.success) {
        infoLog("Deployment completed successfully!");
        for (const key of Object.keys(result.data || {})) {
          infoLog(`  ${key}: ${JSON.stringify((result.data as any)[key])}`);
        }

        return await this.deploy.update({
          logs: this.logs,
          status: "success",
          data: result.data || this.deploy.data,
          completedAt: Date.now(),
        });
      } else {
        errorLog(`Deployment failed: ${result.error}`);
        return await this.deploy.update({
          logs: this.logs,
          status: "failed",
          error: result.error,
          completedAt: Date.now(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog(`Deployment error: ${errorMessage}`);

      if (!abortSignal?.aborted) {
        return await this.deploy.update({
          logs: this.logs,
          status: "failed",
          error: errorMessage,
          completedAt: Date.now(),
        });
      } else {
        return await this.deploy.update({
          logs: this.logs,
          status: "cancelled",
        });
      }
    } finally {
      this.emitter.emit("complete", this.isCompleted);
    }
  }

  protected abstract performDeploy(): Promise<DeployResult<T>>;
  protected abstract getDestinationName(): string;

  protected async validateBuildOutput(): Promise<void> {
    const build = this.deploy.buildId ? await BuildDAO.FetchFromGuid(this.deploy.buildId) : null;
    if (!build || !this.buildDisk || !this.buildOutputPath) {
      throw new Error("Build, disk, or output path not available");
    }

    // Check if build output exists and has files
    try {
      await this.buildDisk.refresh();
      const buildNode = this.buildDisk.fileTree.nodeFromPath(this.buildOutputPath);
      if (!buildNode) {
        throw new Error("Build output directory not found");
      }

      const fileCount = buildNode.countChildren();
      if (fileCount === 0) {
        throw new Error("Build output directory is empty");
      }

      this.log(`Found ${fileCount} files in build output`, "info");
    } catch (error) {
      throw new Error(`Build validation failed: ${error}`);
    }
  }
}

export class NullDeployRunner extends DeployRunner<BaseDeployData> {
  constructor() {
    super({
      deploy: NULL_DEPLOY,
      destination: {} as RemoteAuthAgent,
      build: {} as BuildDAO,
      data: {},
    });
  }

  async execute(): Promise<DeployDAO<BaseDeployData>> {
    return this.deploy;
  }

  protected async performDeploy(): Promise<DeployResult<BaseDeployData>> {
    return { success: false, error: "Null deploy runner" };
  }

  protected getDestinationName(): string {
    return "null";
  }
}

export const NULL_DEPLOY_RUNNER = new NullDeployRunner();
