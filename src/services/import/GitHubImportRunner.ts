import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { GithubImport } from "@/features/workspace-import/GithubImport";
import { relPath } from "@/lib/paths2";
import { BaseImportRunner, getIdent } from "@/services/import/ImportRunner";
import { WorkspaceDefaultManifest, WorkspaceImportManifestType } from "@/services/import/manifest";

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

  // createImportMeta(importManifest: Partial<WorkspaceImportManifestType>): WorkspaceImportManifestType {
  //   return {
  //     version: 1,
  //     description: "GitHub import",
  //     type: "template",
  //     ident: this.ident,
  //     provider: "github",
  //     details: {
  //       url: pathModule.join("https://github.com", this.config.fullRepoPath),
  //     },
  //     ...importManifest,
  //   };
  // }

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
