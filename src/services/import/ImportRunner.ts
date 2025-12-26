import { Disk } from "@/data/disk/Disk";
import { GithubImport } from "@/features/workspace-import/WorkspaceImport";
import { absPath, relPath } from "@/lib/paths2";
import { ObservableRunner } from "@/services/build/ObservableRunner";

export class ImportRunner extends ObservableRunner<any> {
  private disk: Disk;
  private importer: GithubImport;
  protected abortController: AbortController = new AbortController();

  constructor({ disk, fullRepoPath }: { disk: Disk; fullRepoPath: string }) {
    super({
      status: "idle",
      logs: [],
      error: null,
    });
    this.disk = disk;
    this.importer = new GithubImport(relPath(fullRepoPath));
  }

  static Create({ disk, fullRepoPath }: { disk: Disk; fullRepoPath: string }): ImportRunner {
    return new ImportRunner({ disk, fullRepoPath });
  }

  static async Recall(): Promise<ImportRunner> {
    throw new Error("ImportRunner does not support recall - imports are single-use operations");
  }

  cancel(): void {
    this.abortController.abort();
  }

  async execute({
    abortSignal = this.abortController.signal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<void> {
    try {
      this.target.status = "pending";
      this.target.error = null;

      if (abortSignal?.aborted) {
        this.log("Import cancelled", "error");
        this.target.status = "error";
        return;
      }

      this.log("Starting repository import...", "info");

      for await (const file of this.importer.fetchFiles(abortSignal)) {
        if (abortSignal?.aborted) {
          this.log("Import cancelled", "error");
          this.target.status = "error";
          return;
        }

        // Write the file to the disk
        await this.disk.writeFile(absPath(file.path), file.content);
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully!", "info");
      this.target.status = "success";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Import failed: ${errorMessage}`, "error");
      this.target.error = `Import failed: ${errorMessage}`;
      this.target.status = "error";
    }
  }
}

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
