import { GitHubClient } from "@/api/github/GitHubClient";
import { WorkspaceImport } from "@/data/disk/Disk";
import { BadRequestError } from "@/lib/errors/errors";
import { RelPath } from "@/lib/paths2";

export class GithubImport implements WorkspaceImport {
  private owner: string;
  private repo: string;
  private branch: string;
  private client: GitHubClient;

  constructor(repoPath: RelPath) {
    const [owner, repo, branch = "main"] = repoPath.split("/");
    if (!owner || !repo) throw new BadRequestError("Invalid repository path. Expected format: owner/repo");
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.client = new GitHubClient();
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: string }> {
    yield* this.client.fetchRepositoryFiles({ owner: this.owner, repo: this.repo, branch: this.branch }, { signal });
  }
}
