import { Builder, BuildStrategy } from "@/builder/builder";
import { BuildDAO } from "@/Db/BuildDAO";
import { Disk } from "@/Db/Disk";
import { HideFs } from "@/Db/HideFs";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { absPath } from "@/lib/paths2";

export interface BuildServiceOptions {
  strategy: BuildStrategy;
  sourceDisk: Disk;
  outputDisk: Disk;
  onLog?: (message: string) => void;
  onError?: (message: string) => void;
  abortSignal?: AbortSignal;
}

export interface BuildResult {
  success: boolean;
  buildDao?: BuildDAO;
  error?: string;
}

export class BuildService {
  private originalFs: any = null;
  private sourceDisk: Disk | null = null;

  async executeBuild(options: BuildServiceOptions): Promise<BuildResult> {
    const {
      strategy,
      sourceDisk,
      outputDisk, // = options.sourceDisk,
      onLog = () => {},
      onError = () => {},
      abortSignal,
    } = options;

    try {
      onLog(`Starting ${strategy} build...`);
      onLog("Filtering out special directories");

      await this.setupFilteredFileSystem(sourceDisk);

      if (abortSignal?.aborted) {
        onError("Build cancelled");
        return { success: false, error: "Build cancelled" };
      }

      const builder = new Builder({
        strategy,
        sourceDisk,
        outputDisk,
        sourcePath: absPath("/"),
        outputPath: absPath("/"),
        onLog: (message) => onLog(message),
        onError: (message) => onError(message),
      });

      await builder.build();

      if (abortSignal?.aborted) {
        onError("Build cancelled");
        return { success: false, error: "Build cancelled" };
      }

      onLog("Build completed successfully!");

      const buildDao = await this.createBuildRecord(strategy, sourceDisk);
      onLog(`Build saved with ID: ${buildDao.guid}`);

      return { success: true, buildDao };
    } catch (error) {
      if (!abortSignal?.aborted) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        onError?.(`Build failed: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
      return { success: false, error: "Build cancelled" };
    } finally {
      this.restoreOriginalFileSystem();
    }
  }

  private async setupFilteredFileSystem(sourceDisk: Disk): Promise<void> {
    const hiddenPaths = [...SpecialDirs.All];
    const hideFs = new HideFs((sourceDisk as any).fs, hiddenPaths);

    this.originalFs = (sourceDisk as any).fs;
    this.sourceDisk = sourceDisk;

    Object.defineProperty(sourceDisk, "fs", {
      get: () => hideFs,
      configurable: true,
    });
  }

  private async createBuildRecord(strategy: BuildStrategy, sourceDisk: Disk): Promise<BuildDAO> {
    const buildLabel = `${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Build - ${new Date().toLocaleString()}`;
    const buildDao = await BuildDAO.CreateNew(buildLabel, sourceDisk.guid);
    await buildDao.save();
    return buildDao;
  }

  private restoreOriginalFileSystem(): void {
    if (this.originalFs && this.sourceDisk) {
      Object.defineProperty(this.sourceDisk, "fs", {
        get: () => this.originalFs,
        configurable: true,
      });
      this.originalFs = null;
      this.sourceDisk = null;
    }
  }

  cancelBuild(): void {
    this.restoreOriginalFileSystem();
  }
}
