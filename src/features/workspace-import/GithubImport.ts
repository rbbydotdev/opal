import { GitHubClient } from "@/api/github/GitHubClient";
import { WorkspaceImport } from "@/data/disk/Disk";
import { BadRequestError } from "@/lib/errors/errors";
import { RelPath } from "@/lib/paths2";
import { tryParseJSON } from "@/lib/tryParseJSON";
import { getRepoInfo } from "@/services/import/ImportRunner";
import { WorkspaceImportManifestSchema, WorkspaceImportManifestType } from "@/services/import/manifest";
export class GithubImport implements WorkspaceImport {
  private owner: string;
  private repo: string;
  private branch: string | undefined;
  private client: GitHubClient;
  private resolvedBranch: string | null = null;

  constructor(repoPath: RelPath) {
    const { owner, repo, branch } = getRepoInfo(repoPath, {}); // Pass empty defaults to get undefined when no branch in URL
    if (!owner || !repo) throw new BadRequestError("Invalid repository path. Expected format: owner/repo");
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.client = new GitHubClient();
  }

  private async resolveBranch(signal: AbortSignal, manifest?: { defaultBranch?: string }): Promise<string> {
    if (this.resolvedBranch) return this.resolvedBranch;

    // 1. URL path (explicit branch)
    if (this.branch) {
      this.resolvedBranch = this.branch;
      return this.resolvedBranch;
    }

    // 2. Manifest defaultBranch
    if (manifest?.defaultBranch) {
      this.resolvedBranch = manifest.defaultBranch;
      return this.resolvedBranch;
    }

    // 3. GitHub API default branch
    try {
      this.resolvedBranch = await this.client.getRepositoryDefaultBranch(
        { owner: this.owner, repo: this.repo },
        { signal }
      );
      return this.resolvedBranch;
    } catch (error) {
      console.warn("Failed to get default branch from GitHub, falling back to 'main':", error);
      this.resolvedBranch = "main";
      return this.resolvedBranch;
    }
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<string> }> {
    // First try to fetch manifest to resolve branch
    let manifest: { defaultBranch?: string } | undefined;
    try {
      manifest = await this.fetchManifest(signal);
    } catch (error) {
      // Manifest might not exist, continue with branch resolution
    }

    const branch = await this.resolveBranch(signal, manifest);
    yield* this.client.fetchRepositoryFiles({ owner: this.owner, repo: this.repo, branch }, { signal });
  }

  async fetchManifest(signal: AbortSignal): Promise<WorkspaceImportManifestType> {
    // Try to fetch manifest with the best branch we can determine
    let branch = this.branch;
    if (!branch) {
      // If no explicit branch, try to get default from GitHub API first
      try {
        branch = await this.client.getRepositoryDefaultBranch({ owner: this.owner, repo: this.repo }, { signal });
      } catch {
        branch = "main"; // Final fallback
      }
    }

    const response = await this.client.getFileContent(
      { owner: this.owner, repo: this.repo, branch, path: "manifest.json" },
      { signal }
    );
    const m = tryParseJSON(response);
    if (m === null) throw new BadRequestError("Invalid manifest.json file").hint(response.slice(0, 200));
    return WorkspaceImportManifestSchema.parse(m);
  }
}
