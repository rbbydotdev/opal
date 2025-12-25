import { Disk } from "@/data/disk/Disk";
import { GithubImport } from "@/features/workspace-import/WorkspaceImport";
import { absPath, relPath } from "@/lib/paths2";
import { BaseRunner } from "@/services/runners/BaseRunner";
import { RunnerStatic } from "@/types/RunnerInterfaces";

// Define the exact argument types for ImportRunner's static methods
type ImportRunnerCreateArgs = [
  {
    disk: Disk;
    fullRepoPath: string;
  },
];

type ImportRunnerRecallArgs = []; // ImportRunner doesn't support recall

export class ImportRunner extends BaseRunner {
  private disk: Disk;
  private importer: GithubImport;

  constructor({ disk, fullRepoPath }: { disk: Disk; fullRepoPath: string }) {
    super();
    this.disk = disk;
    this.importer = new GithubImport(relPath(fullRepoPath));
  }

  static Create({ disk, fullRepoPath }: ImportRunnerCreateArgs[0]): ImportRunner {
    return new ImportRunner({ disk, fullRepoPath });
  }

  static async Recall(): Promise<ImportRunner> {
    throw new Error("ImportRunner does not support recall - imports are single-use operations");
  }

  async execute({
    abortSignal = this.abortController.signal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<void> {
    try {
      this.setRunning(true);
      this.setCompleted(false);
      this.clearError();

      if (abortSignal?.aborted) {
        this.log("Import cancelled", "error");
        return;
      }

      this.log("Starting repository import...", "info");

      for await (const file of this.importer.fetchFiles(abortSignal)) {
        if (abortSignal?.aborted) {
          this.log("Import cancelled", "error");
          return;
        }

        // Write the file to the disk
        await this.disk.writeFile(absPath(file.path), file.content);
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully!", "info");
      this.setCompleted(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Import failed: ${errorMessage}`, "error");
      this.setError(`Import failed: ${errorMessage}`);
      this.setCompleted(true);
    } finally {
      this.setRunning(false);
    }
  }
}

// Type assertion to ensure ImportRunner conforms to the static interface
const _importRunnerTypeCheck: RunnerStatic<ImportRunner, ImportRunnerCreateArgs, ImportRunnerRecallArgs> = ImportRunner;

export class NullImportRunner extends ImportRunner {
  constructor() {
    super({
      disk: {} as Disk,
      fullRepoPath: "null/null",
    });
  }

  async execute(): Promise<void> {
    // Do nothing
  }
}

export const NULL_IMPORT_RUNNER = new NullImportRunner();
