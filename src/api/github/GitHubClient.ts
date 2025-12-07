import { mapToTypedError } from "@/lib/errors/errors";
import { Octokit } from "@octokit/core";

export interface GitHubRepo {
  updated_at: Date;
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
  bio?: string;
}

export interface GithubInlinedFile {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(auth: string) {
    this.octokit = new Octokit({ auth });
  }

  async getCurrentUser() {
    try {
      const response = await this.octokit.request("GET /user");
      return response.data;
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async createRepo(repoName: string, { signal }: { signal?: AbortSignal } = {}) {
    try {
      const finalRepoName = repoName.trim();
      return this.octokit.request("POST /user/repos", {
        name: finalRepoName,
        private: true,
        auto_init: false,
        request: {
          signal,
        },
      });
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async getRepos({ signal }: { signal?: AbortSignal } = {}): Promise<GitHubRepo[]> {
    try {
      const allRepos: GitHubRepo[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await this.octokit.request("GET /user/repos", {
          page,
          per_page: perPage,
          affiliation: "owner,collaborator",
          headers: {
            "If-None-Match": "", // Force fresh response, bypass browser cache
          },
          request: { signal },
        });

        // Add defensive check for response.data
        if (!Array.isArray(response.data)) {
          logger.error("GitHub API returned unexpected response format:", response.data);
          throw new Error(
            `GitHub API returned unexpected response format. Expected array, got: ${typeof response.data}`
          );
        }

        const result = response.data.map(({ updated_at, id, name, full_name, description, html_url }) => ({
          updated_at: new Date(updated_at ?? Date.now()),
          id,
          name,
          full_name,
          description: description || null,
          html_url,
        }));
        allRepos.push(...result);

        page++;
        const linkHeader = response.headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          break; // No more pages
        }
      }
      return allRepos;
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async deploy({
    owner,
    repo,
    branch,
    message,
    files,
  }: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: GithubInlinedFile[];
  }) {
    const {
      data: {
        object: { sha: latestCommitSha },
      },
    } = await this.octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const {
      data: {
        tree: { sha: baseTreeSha },
      },
    } = await this.octokit.request("GET /repos/{owner}/{repo}/git/commits/{commit_sha}", {
      owner,
      repo,
      commit_sha: latestCommitSha,
    });

    const tree = await Promise.all(
      files.map(async ({ path, content, encoding }) => {
        const {
          data: { sha },
        } = await this.octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
          owner,
          repo,
          content,
          encoding,
        });
        return { path, mode: "100644" as "100644", type: "blob" as "blob", sha };
      })
    );

    const {
      data: { sha: newTreeSha },
    } = await this.octokit.request("POST /repos/{owner}/{repo}/git/trees", {
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    });

    const {
      data: { sha: newCommitSha },
    } = await this.octokit.request("POST /repos/{owner}/{repo}/git/commits", {
      owner,
      repo,
      message,
      tree: newTreeSha,
      parents: [latestCommitSha],
    });

    await this.octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitSha,
    });

    return newCommitSha;
  }

  async checkForUpdates(
    etag: string | null,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    try {
      const response = await this.octokit.request("GET /user/repos", {
        per_page: 1,
        headers: { "If-None-Match": etag ?? undefined },
        request: { signal },
      });

      return { updated: true, newEtag: response.headers.etag || null };
    } catch (error: any) {
      if (error.status === 304) {
        return { updated: false, newEtag: etag };
      }
      throw mapToTypedError(error);
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      logger.error("Error verifying GitHub credentials:", error);
      return false;
    }
  }

  getAuthCredentials(username: string, apiToken: string) {
    return {
      username,
      password: apiToken,
    };
  }
}
