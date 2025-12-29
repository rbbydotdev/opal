import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { GithubImport } from "@/features/workspace-import/GithubImport";
import { AbortError, isAbortError, isApplicationError, unwrapError } from "@/lib/errors/errors";
import { absPath, relPath, stripLeadingSlash } from "@/lib/paths2";
import { tryParseJSON } from "@/lib/tryParseJSON";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { WorkspaceImportManifestType } from "@/services/import/manifest";
import { Runner } from "@/types/RunnerInterfaces";
import { Workspace } from "@/workspace/Workspace";
import pathModule from "path";

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
  abstract createImportMeta(importManifest: Partial<WorkspaceImportManifestType>): WorkspaceImportManifestType;
  abstract getWorkspaceName(): string;
  abstract preflight(): Promise<{
    abort: boolean;
    reason: string;
    navigate: string | null;
  }>;

  async createWorkspaceImport(workspaceName: string, importMeta: WorkspaceImportManifestType): Promise<Workspace> {
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

      this.log("Preflight...", "info");

      const preflightResult = await this.preflight();
      if (preflightResult.abort) {
        this.log(`Import aborted: ${preflightResult.reason}`, "warning");
        this.target.status = "success";
        return preflightResult.navigate ?? "/";
      }

      this.log("Fetching files from source...", "info");

      let manifest = {};
      for await (const file of this.fetchFiles(allAbortSignal)) {
        abortSignal?.throwIfAborted();
        if (file.path === "manifest.json") {
          manifest = tryParseJSON(file.content) || {};
        }
        await this.tmpDisk.writeFileRecursive(absPath(file.path), file.content);
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully", "info");

      const wsImportName = this.getWorkspaceName();

      this.log(`Creating workspace ${wsImportName} from imported files...`, "info");

      const workspace = await this.createWorkspaceImport(wsImportName, this.createImportMeta(manifest));

      this.log("Workspace created successfully", "success");
      this.target.status = "success";

      // FindAlikeImport

      // return workspace;
      return workspace.href;
    } catch (error) {
      if (isAbortError(error)) {
        this.log("Import cancelled by user", "error");
        this.target.error = "Import cancelled by user";
      } else {
        console.error(error);
        const errMsg = isApplicationError(error) ? error.getHint() : unwrapError(error);
        this.log(`Import failed: ${errMsg}`, "error");
        this.target.error = errMsg;
      }
      this.target.status = "error";
      return "/";
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

  createImportMeta(importManifest: Partial<WorkspaceImportManifestType>): WorkspaceImportManifestType {
    return {
      version: 1,
      description: "GitHub import",
      type: "template",
      ident: getIdent(this.config.fullRepoPath),
      provider: "github",
      details: {
        url: pathModule.join("https://github.com", this.config.fullRepoPath),
      },
      ...importManifest,
    };
  }

  async preflight(): Promise<{
    abort: boolean;
    reason: string;
    navigate: string | null;
  }> {
    const ws = await WorkspaceDAO.FindAlikeImport({
      provider: "github",
      ident: getIdent(this.config.fullRepoPath),
      type: "showcase",
    });
    if (ws) {
      return {
        abort: true,
        reason: "Workspace with the same GitHub import already exists.",
        navigate: ws.href,
      };
    }
    return {
      abort: false,
      reason: "",
      navigate: null,
    };
  }

  getWorkspaceName(): string {
    return this.config.fullRepoPath.replace("/", "-");
  }
}

export function getIdent(importPath: string) {
  const { owner, repo } = getRepoInfo(importPath);
  return `${owner}/${repo}`;
}

export function getRepoInfo(importPath: string) {
  const [owner, repo, branch = "main", dir = "/"] = stripLeadingSlash(importPath).split("/");
  return { owner, repo, branch, dir };
}

export class NullImportRunner extends GitHubImportRunner {
  constructor() {
    super({
      fullRepoPath: "null/null",
    });
  }

  async execute() {
    return absPath("/");
  }
}

export const NULL_IMPORT_RUNNER = new NullImportRunner();

// async createWorkspaceFromFromGitRemote(workspaceName: string, remoteURL: string): Promise<Workspace> {
//   //womp womp needs cors
//   const workspace = await Workspace.CreateNew(workspaceName, {}, IndexedDbDisk.type);
//   await workspace.playbook.initFromRemote({ name: "origin", url: remoteURL });
//   return workspace;
// }
