import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { GithubImport } from "@/features/workspace-import/GithubImport";
import { relPath } from "@/lib/paths2";
import { getRepoInfo } from "@/services/import/getRepoInfo";
import { BaseImportRunner, ImportState } from "@/services/import/ImportRunner";
import { WorkspaceDefaultManifest, WorkspaceImportManifestType } from "@/services/import/manifest";
import { join } from "path";

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

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<Uint8Array> }> {
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

  get ident() {
    const { owner, repo } = getRepoInfo(this.config.fullRepoPath);
    return `github:${owner}/${repo}`;
  }

  async preflight(): Promise<{
    abort: boolean;
    reason: string;
    navigate: string | null;
    status: ImportState["status"];
    allowShowcase: boolean;
  }> {
    const allowShowcase = this.repoInfo.owner === "rbbydotdev";

    const ws = await WorkspaceDAO.FindAlikeImport({
      ident: this.ident,
    });
    if (ws) {
      return {
        abort: true,
        reason: "Workspace with the same GitHub import already exists \nRedirecting...",
        navigate: join(ws.href, ws.manifest?.navigate || ""),
        status: "pending",
        allowShowcase,
      };
    }
    if ((await this.importer.repoExists(this.abortController.signal)) === false) {
      return {
        abort: true,
        reason: "The specified GitHub repository does not exist or is inaccessible.",
        status: "error",
        navigate: null,
        allowShowcase,
      };
    }

    return {
      abort: false,
      reason: "",
      navigate: null,
      status: "pending",
      allowShowcase,
    };
  }

  getWorkspaceName(): string {
    return this.config.fullRepoPath.replace("/", "-");
  }
}
