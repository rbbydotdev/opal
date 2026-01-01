import { GitHubClient } from "@/api/github/GitHubClient";
import { BadRequestError, isApplicationError } from "@/lib/errors/errors";
import { RelPath } from "@/lib/paths2";
import { tryParseJSON } from "@/lib/tryParseJSON";
import { getRepoInfo, WorkspaceImport } from "@/services/import/ImportRunner";
import { WorkspaceImportManifestSchema, WorkspaceImportManifestType } from "@/services/import/manifest";
export class GithubImport implements WorkspaceImport {
  private owner: string;
  private repo: string;
  private branch?: string;
  private client: GitHubClient;
  private resolvedBranch: string | null = null;

  constructor(repoPath: RelPath) {
    const { owner, repo, branch } = getRepoInfo(repoPath, {}); // Pass empty defaults to get undefined when no branch in URL
    if (!owner || !repo) throw new BadRequestError("Invalid repository path. Expected format: owner/repo");
    this.owner = owner;
    this.repo = repo;
    this.branch = branch; // Assign branch from URL if present
    this.client = new GitHubClient();
  }

  repoExists = async (signal: AbortSignal): Promise<boolean> => {
    try {
      await this.client.verifyRepositoryExists({ owner: this.owner, repo: this.repo, signal });
      return true;
    } catch (error) {
      if (isApplicationError(error) && error.code === 404) {
        return false;
      }
      throw error;
    }
  };
  private async resolveBranch(signal: AbortSignal): Promise<string> {
    if (this.resolvedBranch) return this.resolvedBranch;

    // 1. URL path (explicit branch)
    if (this.branch) {
      this.resolvedBranch = this.branch;
      return this.resolvedBranch;
    }

    // 2. GitHub API default branch
    try {
      this.resolvedBranch = await this.client.getRepositoryDefaultBranch(
        { owner: this.owner, repo: this.repo },
        { signal }
      );
      return this.resolvedBranch;
    } catch (error) {
      console.warn("Failed to get default branch from GitHub, falling back to 'main':", error);
      // 3. Final fallback to 'main'
      this.resolvedBranch = "main";
      return this.resolvedBranch;
    }
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<Uint8Array> }> {
    const branch = await this.resolveBranch(signal);
    yield* this.client.fetchRepositoryFiles({ owner: this.owner, repo: this.repo, branch }, { signal });
  }

  async fetchManifest(signal: AbortSignal): Promise<WorkspaceImportManifestType> {
    const branch = await this.resolveBranch(signal);

    const response = await this.client.getFileContent(
      { owner: this.owner, repo: this.repo, branch, path: "manifest.json" },
      { signal }
    );
    const responseText = new TextDecoder("utf-8").decode(response);
    const m = tryParseJSON(responseText);
    if (m === null) throw new BadRequestError("Invalid manifest.json file").hint(responseText.slice(0, 200));
    return WorkspaceImportManifestSchema.parse(m);
  }
}
