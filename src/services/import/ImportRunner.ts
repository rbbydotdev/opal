import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { DiskFactoryByType } from "@/data/disk/DiskFactory";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { GithubImport } from "@/features/workspace-import/GithubImport";
import { AbortError, isAbortError, isApplicationError, unwrapError } from "@/lib/errors/errors";
import { absPath, isAllowedFileType, relPath, stripLeadingSlash } from "@/lib/paths2";
import { ObservableRunner } from "@/services/build/ObservableRunner";
import { WorkspaceDefaultManifest, WorkspaceImportManifestType } from "@/services/import/manifest";
import { Runner } from "@/types/RunnerInterfaces";
import { Workspace } from "@/workspace/Workspace";
import pathModule from "path";
import { subscribe } from "valtio";

type ImportState = {
  status: "idle" | "success" | "pending" | "error";
  type: "showcase" | "template";
  logs: Array<{
    type: "info" | "error" | "warning" | "success";
    timestamp: number;
    message: string;
  }>;
  confirmImport: ConfirmImportType;
  error: string | null;
};

export type ConfirmImportType = "idle" | "ask" | "yes" | "no";
export abstract class BaseImportRunner<TConfig = any> extends ObservableRunner<ImportState> implements Runner {
  private tmpDisk = DiskFactoryByType(MemDisk.type);
  protected abortController: AbortController = new AbortController();
  protected config: TConfig;

  constructor(config: TConfig) {
    super({
      status: "idle",
      logs: [],
      type: "template",
      error: null,
      confirmImport: "idle",
    });
    this.config = config;
  }

  abstract fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<string> }>;
  abstract createImportMeta(importManifest: Partial<WorkspaceImportManifestType>): WorkspaceImportManifestType;
  abstract fetchManifest(
    signal: AbortSignal,
    onImportError?: (e: unknown) => void
  ): Promise<WorkspaceImportManifestType>;
  abstract getWorkspaceName(): string;
  abstract preflight(signal: AbortSignal): Promise<{
    abort: boolean;
    reason: string;
    navigate: string | null;
  }>;

  async createWorkspaceImport(
    workspaceName: string,
    ident: string,
    importMeta?: WorkspaceImportManifestType
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
        manifest: importMeta || WorkspaceDefaultManifest(ident),
      }
    );
    return workspace;
  }

  cancel(): void {
    this.abortController.abort(new AbortError("Operation cancelled by user"));
  }

  async run({
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

      const preflightResult = await this.preflight(allAbortSignal);
      if (preflightResult.abort) {
        this.log(`Import aborted: ${preflightResult.reason}`, "warning");
        this.target.status = "success";
        return preflightResult.navigate ?? "/";
      }

      this.log("Fetching manifest...", "info");

      const manifest = await this.fetchManifest(allAbortSignal, (e) => {
        console.error("Error fetching manifest:", unwrapError(e));
      });

      if (manifest.type === "template") {
        this.log("Confirming import", "info");
        await this.waitForTemplateConfirmation(allAbortSignal);
      }

      this.log("Fetching files from source...", "info");

      for await (const file of this.fetchFiles(allAbortSignal)) {
        if (!isAllowedFileType(file.path)) continue;
        abortSignal?.throwIfAborted();
        await this.tmpDisk.writeFileRecursive(absPath(file.path), await file.content());
        this.log(`Imported file: ${file.path}`, "info");
      }

      this.log("Import completed successfully", "info");

      const workspaceName = this.getWorkspaceName();

      this.log(`Creating workspace ${workspaceName} from imported files...`, "info");

      const workspace = await this.createWorkspaceImport(workspaceName, manifest.ident, manifest);

      this.log("Workspace created successfully", "success");

      this.target.status = "success";

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

  setConfirm(value: ConfirmImportType) {
    this.target.confirmImport = value;
  }
  waitForTemplateConfirmation(signal: AbortSignal) {
    this.target.type = "template";
    this.target.confirmImport = "ask";
    console.log("Setting confirmImport to 'ask'");

    // Use Valtio subscribe to wait for confirmImport change
    return new Promise<ConfirmImportType>((resolve, reject) => {
      const unsubscribe = subscribe(this.target, () => {
        if (this.target.confirmImport !== "ask") {
          unsubscribe();
          resolve(this.target.confirmImport);
        }
      });

      signal.addEventListener("abort", () => {
        unsubscribe();
        reject(signal.reason);
      });
    });
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

  private _importer: GithubImport | null = null;
  get importer() {
    return (this._importer = this._importer || new GithubImport(relPath(this.config.fullRepoPath)));
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<string> }> {
    yield* this.importer.fetchFiles(signal);
  }

  async fetchManifest(signal: AbortSignal, onImportError?: (e: unknown) => void): Promise<WorkspaceImportManifestType> {
    try {
      return await this.importer.fetchManifest(signal);
    } catch (e) {
      onImportError?.(e);
    }
    return WorkspaceDefaultManifest(this.ident);
  }

  createImportMeta(importManifest: Partial<WorkspaceImportManifestType>): WorkspaceImportManifestType {
    return {
      version: 1,
      description: "GitHub import",
      type: "template",
      ident: this.ident,
      provider: "github",
      details: {
        url: pathModule.join("https://github.com", this.config.fullRepoPath),
      },
      ...importManifest,
    };
  }

  get ident() {
    return getIdent(this.config.fullRepoPath);
  }

  async preflight(): Promise<{
    abort: boolean;
    reason: string;
    navigate: string | null;
  }> {
    const ws = await WorkspaceDAO.FindAlikeImport({
      provider: "github",
      ident: this.ident,
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

  async run() {
    return absPath("/");
  }
  fetchManifest(): Promise<WorkspaceImportManifestType> {
    return Promise.resolve({
      version: 1,
      description: "Null import",
      type: "template",

      ident: "null/null",
      provider: "null",
      details: {
        url: "null://null",
      },
    });
  }
}

export const NULL_IMPORT_RUNNER = new NullImportRunner();

// async createWorkspaceFromFromGitRemote(workspaceName: string, remoteURL: string): Promise<Workspace> {
//   //womp womp needs cors
//   const workspace = await Workspace.CreateNew(workspaceName, {}, IndexedDbDisk.type);
//   await workspace.playbook.initFromRemote({ name: "origin", url: remoteURL });
//   return workspace;
// }
