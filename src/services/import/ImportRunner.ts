import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { GithubImport } from "@/features/workspace-import/GithubImport";
import { AbortError, isAbortError, isApplicationError, unwrapError } from "@/lib/errors/errors";
import { absPath, relPath } from "@/lib/paths2";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { Runner } from "@/types/RunnerInterfaces";
import { NULL_WORKSPACE } from "@/workspace/NullWorkspace";
import { Workspace } from "@/workspace/Workspace";

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
  protected abortController: AbortController = new AbortController();
  readonly fullRepoPath: string;

  constructor({ fullRepoPath }: { fullRepoPath: string }) {
    super({
      status: "idle",
      logs: [],
      error: null,
    });
    this.fullRepoPath = fullRepoPath;
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

  async createWorkspaceFromTmpDisk(workspaceName: string): Promise<Workspace> {
    await this.tmpDisk.superficialIndex();
    const sourceTree = this.tmpDisk.fileTree.toSourceTree();
    const workspace = await Workspace.CreateNew(workspaceName, sourceTree.iterator(), IndexedDbDisk.type);

    // sourceTree.walkBFS((node,__,exit)=>{
    //   if (node.isMarkdownFile()){
    //     exit();
    //   }

    // })
    // workspace.Repo
    // workspace.playbook.initFromRemote("origin",)
    return workspace;
  }

  async createWorkspaceFromFromGitRemote(workspaceName: string, remoteURL: string): Promise<Workspace> {
    //womp womp needs cors
    const workspace = await Workspace.CreateNew(workspaceName, {}, IndexedDbDisk.type);
    await workspace.playbook.initFromRemote({ name: "origin", url: remoteURL });
    return workspace;
  }

  cancel(): void {
    this.abortController.abort(new AbortError("Operation cancelled by user"));
  }

  get repoInfo() {
    const [owner, repo] = this.fullRepoPath.split("/");
    return { owner, repo };
  }

  async execute({
    abortSignal,
  }: {
    abortSignal?: AbortSignal;
  } = {}) {
    const allAbortSignal = AbortSignal.any([this.abortController.signal, abortSignal].filter(Boolean));
    try {
      const importer = new GithubImport(relPath(this.fullRepoPath));
      this.target.status = "pending";
      this.target.error = null;

      abortSignal?.throwIfAborted();

      this.log("Starting repository import...", "info");
      for await (const file of importer.fetchFiles(allAbortSignal)) {
        abortSignal?.throwIfAborted();
        await this.tmpDisk.writeFile(absPath(file.path), file.content);
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully", "info");

      const wsImportName = this.fullRepoPath.replace("/", "-");

      this.log(`Creating workspace ${wsImportName} from imported files...`, "info");
      const workspace = await this.createWorkspaceFromTmpDisk(wsImportName);
      this.log("Workspace created successfully", "success");
      this.target.status = "success";
      return workspace;
    } catch (error) {
      if (isAbortError(error)) {
        this.log("Import cancelled by user", "error");
        this.target.error = "Import cancelled by user";
      } else {
        const errMsg = isApplicationError(error) ? error.getHint() : unwrapError(error);
        this.log(`Import failed: ${errMsg}`, "error");
        this.target.error = errMsg;
      }
      this.target.status = "error";
      return NULL_WORKSPACE;
    }
  }
}

export class NullImportRunner extends ImportRunner {
  constructor() {
    super({
      fullRepoPath: "null/null",
    });
  }

  async execute() {
    return NULL_WORKSPACE;
  }
}

export const NULL_IMPORT_RUNNER = new NullImportRunner();
