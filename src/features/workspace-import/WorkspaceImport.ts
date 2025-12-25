import { WorkspaceImport } from "@/data/disk/Disk";
import { AbortError, BadRequestError, isAbortError, mapToTypedError } from "@/lib/errors/errors";
import { RelPath } from "@/lib/paths2";

export class GithubImport implements WorkspaceImport {
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(repoPath: RelPath, branch: string = "main") {
    const [owner, repo] = repoPath.split("/");
    if (!owner || !repo) throw new BadRequestError("Invalid repository path. Expected format: owner/repo");
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  async *fetchFiles(signal: AbortSignal): AsyncGenerator<{ path: string; content: string }> {
    try {
      // First, get the repository tree to find all files
      const treeResponse = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`,
        {
          signal,
        }
      );

      if (!treeResponse.ok) {
        const errorMessage =
          treeResponse.status === 404
            ? `Repository ${this.owner}/${this.repo} not found or branch ${this.branch} does not exist`
            : treeResponse.status === 403 || treeResponse.status === 401
              ? `Access denied to repository ${this.owner}/${this.repo}. Repository may be private.`
              : `Failed to fetch repository tree`;

        throw mapToTypedError(new Error(errorMessage), {
          code: treeResponse.status,
          path: `${this.owner}/${this.repo}`,
        });
      }

      const treeData = (await treeResponse.json()) as { tree: Array<{ path: string; type: string }> };
      const files = treeData.tree.filter((item) => item.type === "blob");

      // Fetch content for each file using raw.githubusercontent.com
      for (const file of files) {
        if (signal.aborted) {
          throw new AbortError();
        }
        try {
          const contentResponse = await fetch(
            `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${file.path}`,
            { signal }
          );

          if (!contentResponse.ok) {
            console.warn(`Failed to fetch ${file.path}: ${contentResponse.status}`);
            continue;
          }

          const content = await contentResponse.text();
          yield {
            path: file.path,
            content: content,
          };
        } catch (error) {
          console.warn(`Error fetching ${file.path}:`, error);
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw mapToTypedError(error, {
        message: `Failed to fetch repository content for ${this.owner}/${this.repo}`,
        path: `${this.owner}/${this.repo}`,
      });
    }
  }
}
