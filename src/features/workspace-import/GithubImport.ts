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
  private branch: string;
  private client: GitHubClient;

  constructor(repoPath: RelPath) {
    const { owner, repo, branch } = getRepoInfo(repoPath);
    if (!owner || !repo) throw new BadRequestError("Invalid repository path. Expected format: owner/repo");
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.client = new GitHubClient();
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: () => Promise<string> }> {
    yield* this.client.fetchRepositoryFiles({ owner: this.owner, repo: this.repo, branch: this.branch }, { signal });
  }
  async fetchManifest(signal: AbortSignal): Promise<WorkspaceImportManifestType> {
    const response = await this.client.getFileContent(
      { owner: this.owner, repo: this.repo, branch: this.branch, path: "manifest.json" },
      { signal }
    );
    const m = tryParseJSON(response);
    if (m === null) throw new BadRequestError("Invalid manifest.json file").hint(response.slice(0, 200));
    return WorkspaceImportManifestSchema.parse(m);
  }
}
