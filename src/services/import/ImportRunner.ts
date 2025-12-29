import { WorkspaceRecord } from "@/data/dao/WorkspaceRecord";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { GithubImport } from "@/features/workspace-import/GithubImport";
import { AbortError, isAbortError, isApplicationError, unwrapError } from "@/lib/errors/errors";
import { absPath, relPath } from "@/lib/paths2";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { WorkspaceImportManifestType } from "@/services/import/manifest";
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

export abstract class BaseImportRunner<TConfig = any> extends ObservableRunner<ImportState> implements Runner {
  private tmpDisk = DiskFactoryByType(MemDisk.type);
  protected abortController: AbortController = new AbortController();
  protected config: TConfig;

  constructor(config: TConfig) {
    super({
      status: "idle",
      logs: [],
      error: null,
    });
    this.config = config;
  }

  abstract fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: string }>;
  abstract createImportMeta(): WorkspaceImportManifestType;
  abstract getWorkspaceName(): string;

  async createWorkspaceImport(
    workspaceName: string,
    importMeta: WorkspaceImportManifestType
  ): Promise<Workspace> {
    await this.tmpDisk.superficialIndex();
    const sourceTree = this.tmpDisk.fileTree.toSourceTree();
    const workspace = await Workspace.CreateNew(
      {
        name: workspaceName,
        files: sourceTree.iterator(),
        diskType: IndexedDbDisk.type,
      },
      {
        manifest: importMeta,
      }
    );
    return workspace;
  }

  cancel(): void {
    this.abortController.abort(new AbortError("Operation cancelled by user"));
  }

  async execute({
    abortSignal,
  }: {
    abortSignal?: AbortSignal;
  } = {}) {
    const allAbortSignal = AbortSignal.any([this.abortController.signal, abortSignal].filter(Boolean));
    try {
      this.target.status = "pending";
      this.target.error = null;

      abortSignal?.throwIfAborted();

      this.log("Starting import...", "info");
      for await (const file of this.fetchFiles(allAbortSignal)) {
        abortSignal?.throwIfAborted();
        await this.tmpDisk.writeFile(absPath(file.path), file.content);
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully", "info");

      const wsImportName = this.getWorkspaceName();

      this.log(`Creating workspace ${wsImportName} from imported files...`, "info");

      const workspace = await this.createWorkspaceImport(wsImportName, this.createImportMeta());

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

export class GitHubImportRunner extends BaseImportRunner<{ fullRepoPath: string }> {
  constructor({ fullRepoPath }: { fullRepoPath: string }) {
    super({ fullRepoPath });
  }

  static Create({ fullRepoPath }: { fullRepoPath: string }): GitHubImportRunner {
    return new GitHubImportRunner({ fullRepoPath });
  }

  static Show(_: any): GitHubImportRunner {
    return new GitHubImportRunner({ fullRepoPath: "show/show" });
  }

  static async Recall(): Promise<GitHubImportRunner> {
    return new GitHubImportRunner({ fullRepoPath: "recall/recall" });
  }

  get repoInfo() {
    const [owner, repo] = this.config.fullRepoPath.split("/");
    return { owner, repo };
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: string }> {
    const importer = new GithubImport(relPath(this.config.fullRepoPath));
    yield* importer.fetchFiles(signal);
  }

  createImportMeta(): WorkspaceImportManifestType {
    return {
      version: 1,
      description: "GitHub import",
      type: "template",
      id: this.config.fullRepoPath,
      provider: "github",
      details: {
        url: `https://github.com/${this.config.fullRepoPath}`,
      },
    };
  }

  getWorkspaceName(): string {
    return this.config.fullRepoPath.replace("/", "-");
  }
}

export class NullImportRunner extends GitHubImportRunner {
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

// async createWorkspaceFromFromGitRemote(workspaceName: string, remoteURL: string): Promise<Workspace> {
//   //womp womp needs cors
//   const workspace = await Workspace.CreateNew(workspaceName, {}, IndexedDbDisk.type);
//   await workspace.playbook.initFromRemote({ name: "origin", url: remoteURL });
//   return workspace;
// }
