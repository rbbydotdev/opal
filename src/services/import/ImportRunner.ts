import { Disk } from "@/data/disk/Disk";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { MemDisk } from "@/data/disk/MemDisk";
import { GithubImport } from "@/features/workspace-import/WorkspaceImport";
import { absPath, relPath } from "@/lib/paths2";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { Runner } from "@/types/RunnerInterfaces";

type ImportState = {
  status: "idle" | "success" | "pending" | "error";
  logs: Array<{
    type: "info" | "error" | "warning" | "success";
    timestamp: number;
    message: string;
  }>;
  error: string | null;
};

export class ImportRunner extends ObservableRunner<ImportState> implements Runner {
  // private tmpDisk: Disk;
  private tmpDisk = DiskFactoryByType(MemDisk.type);
  private importer: GithubImport;
  protected abortController: AbortController = new AbortController();

  constructor({ fullRepoPath }: { fullRepoPath: string }) {
    super({
      status: "idle",
      logs: [],
      error: null,
    });
    this.importer = new GithubImport(relPath(fullRepoPath));
  }

  static Create({ fullRepoPath }: { fullRepoPath: string }): ImportRunner {
    return new ImportRunner({ fullRepoPath });
  }

  static Show(_: any): ImportRunner {
    return new ImportRunner({ fullRepoPath: "show/show" });
  }

  static async Recall(): Promise<ImportRunner> {
    return new ImportRunner({ fullRepoPath: "recall/recall" });
  }

  async writeMemDiskToDisk(realDisk: Disk): Promise<void> {
    await this.tmpDisk.copyDiskToDisk(realDisk);
    //no op for now
    // const fileTree = await this.disk.triggerIndex();
    // for (const file of fileTree.iterator()) {
    //   if (file.isTreeFile()) {
    //     await realDisk.writeFile(file.path, file.read());
    //   }
    // }
  }

  cancel(): void {
    //when import is cancelled, we should clean up any partial files written to disk
    //as a matter of fact we should use a MemoryDisk during import and only write to the real disk on success
    //look in git history for MemoryDisk which has been remove
    //would be nice to copy one disk to another easily which is already kind of done when we move files between disks
    //we could use disk file tree iterator actually
    // for (const file of this.disk.getFlatTree()){}
    this.abortController.abort();
  }

  async execute({
    abortSignal = this.abortController.signal,
  }: {
    abortSignal?: AbortSignal;
  } = {}): Promise<ImportState> {
    try {
      this.target.status = "pending";
      this.target.error = null;

      if (abortSignal?.aborted) {
        this.log("Import cancelled", "error");
        this.target.status = "error";
        return this.target;
      }

      this.log("Starting repository import...", "info");

      for await (const file of this.importer.fetchFiles(abortSignal)) {
        if (abortSignal?.aborted) {
          this.log("Import cancelled", "error");
          this.target.status = "error";
          return this.target;
        }

        // Write the file to the disk
        await this.tmpDisk.writeFile(absPath(file.path), file.content);
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

    return this.target;
  }
}

export class NullImportRunner extends ImportRunner {
  constructor() {
    super({
      fullRepoPath: "null/null",
    });
  }

  async execute(): Promise<ImportState> {
    return this.target;
  }
}

export const NULL_IMPORT_RUNNER = new NullImportRunner();
