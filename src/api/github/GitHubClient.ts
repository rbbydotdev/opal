import { OctokitClient } from "@/auth/OctokitClient";
import { isAbortError, mapToTypedError } from "@/lib/errors/errors";
import { DeployBundleTreeEntry } from "@/services/deploy/DeployBundle";
import { Octokit } from "@octokit/core";

export interface GitHubRepo {
  updated_at: Date;
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
}

type GithubTreeItem = {
  path?: string;
  mode?: "100644" | "100755" | "040000" | "160000" | "120000";
  type?: "blob" | "tree" | "commit";
  sha?: string | null;
  content?: string;
};

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
  bio?: string;
}

export type GithubInlinedFile = Extract<DeployBundleTreeEntry, { type: "file" }>;

export class GitHubClient {
  private octokit: Octokit;

  constructor(auth: string) {
    this.octokit = OctokitClient({
      auth,
      request: {
        fetch: globalThis.fetch,
      },
    });
  }

  async getCurrentUser() {
    try {
      const response = await this.getCurrentUserRequest();
      return response.data;
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  private async getCurrentUserRequest() {
    return this.octokit.request("GET /user");
  }

  async createRepo(
    { repoName, private: isPrivate }: { repoName: string; private?: boolean },
    { signal }: { signal?: AbortSignal } = {}
  ) {
    try {
      const finalRepoName = repoName.trim();
      return this.octokit.request("POST /user/repos", {
        name: finalRepoName,
        private: isPrivate ?? true, // Default to private if not specified
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
        const response = await this.getUserReposRequest({ page, perPage, signal });

        // Add defensive check for response.data
        if (!Array.isArray(response.data)) {
          logger.error("GitHub API returned unexpected response format:", response.data);
          throw new Error(
            `GitHub API returned unexpected response format. Expected array, got: ${typeof response.data}`
          );
        }

        const result = response.data.map(
          ({ updated_at, id, name, full_name, description, html_url, private: isPrivate }) => ({
            updated_at: new Date(updated_at ?? Date.now()),
            id,
            name,
            full_name,
            description: description || null,
            html_url,
            private: isPrivate,
          })
        );
        allRepos.push(...result);

        page++;
        const linkHeader = response.headers.link;
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
          break; // No more pages
        }
      }
      return allRepos;
    } catch (e) {
      if (isAbortError(e)) throw e;
      throw mapToTypedError(e);
    }
  }

  private async getUserReposRequest({
    page,
    perPage,
    signal,
  }: {
    page: number;
    perPage: number;
    signal?: AbortSignal;
  }) {
    return this.octokit.request("GET /user/repos", {
      page,
      per_page: perPage,
      affiliation: "owner,collaborator",
      headers: {
        "If-None-Match": "",
      },
      request: { signal },
    });
  }

  async deploy(
    {
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
    },
    logStatus: (status: string) => void = () => {}
  ) {
    console.log('GitHubClient.deploy: Received files, count:', files.length);
    console.log('GitHubClient.deploy: First file received:', files[0]);
    console.log('GitHubClient.deploy: First file getContent type:', typeof files[0]?.getContent);
    const { latestCommitSha, baseTreeSha, isOrphan } = await this.resolveBranchForDeploy({
      owner,
      repo,
      branch,
      logStatus,
    });
    const newCommitSha = await this.createDeployCommit({
      owner,
      repo,
      branch,
      message,
      files,
      baseTreeSha: isOrphan ? undefined : (baseTreeSha ?? undefined),
      parentSha: isOrphan ? undefined : (latestCommitSha ?? undefined),
      logStatus,
    });
    return newCommitSha;
  }

  private async resolveBranchForDeploy({
    owner,
    repo,
    branch,
    logStatus = () => {},
  }: {
    owner: string;
    repo: string;
    branch: string;
    logStatus?: (status: string) => void;
  }) {
    try {
      logStatus(`Checking if branch '${branch}' exists...`);
      const {
        data: {
          object: { sha },
        },
      } = await this.getBranchRefRequest({ owner, repo, branch });

      const {
        data: {
          tree: { sha: baseTreeSha },
        },
      } = await this.getCommitRequest({ owner, repo, commitSha: sha });

      logStatus(`Found existing branch '${branch}'`);
      return { latestCommitSha: sha, baseTreeSha, isOrphan: false };
    } catch (error: any) {
      if (error.status === 404) {
        // Branch doesn't exist, create as orphan (no parent)
        logStatus(`Branch '${branch}' not found, will create as orphan branch`);
        return { latestCommitSha: undefined, baseTreeSha: undefined, isOrphan: true };
      } else {
        throw error;
      }
    }
  }

  private async createDeployCommit({
    owner,
    repo,
    branch,
    message,
    files,
    baseTreeSha,
    parentSha,
    logStatus = () => {},
  }: {
    owner: string;
    repo: string;
    branch: string;
    message: string;
    files: GithubInlinedFile[];
    baseTreeSha?: string;
    parentSha?: string;
    logStatus?: (status: string) => void;
  }) {
    const tree: GithubTreeItem[] = [];

    logStatus(`Creating blobs for ${files.length} files...`);
    for (const file of files) {
      const content = await file.getContent();
      const {
        data: { sha },
      } = await this.createBlobRequest({ owner, repo, content: content.toString(), encoding: file.encoding });

      tree.push({ path: file.path, mode: "100644", type: "blob", sha });
    }

    logStatus(`Creating tree with ${tree.length} files...`);
    const {
      data: { sha: newTreeSha },
    } = await this.createTreeRequest({
      owner,
      repo,
      baseTree: baseTreeSha || "",
      tree,
    });

    const commitParams: any = {
      owner,
      repo,
      message,
      tree: newTreeSha,
    };

    if (parentSha) {
      commitParams.parentSha = parentSha;
    }

    logStatus(`Creating commit: "${message}"...`);
    const {
      data: { sha: newCommitSha },
    } = await this.createCommitRequest(commitParams);

    try {
      logStatus(`Updating branch '${branch}' (force push)...`);
      await this.updateBranchRefRequest({ owner, repo, branch, sha: newCommitSha });
    } catch (error: any) {
      if (error.status === 422) {
        // Branch doesn't exist, create it
        logStatus(`Creating new branch '${branch}'...`);
        await this.createBranchRefRequest({ owner, repo, branch, sha: newCommitSha });
      } else {
        throw error;
      }
    }

    logStatus(`Deploy completed successfully!`);

    return newCommitSha;
  }

  private async getBranchRefRequest({ owner, repo, branch }: { owner: string; repo: string; branch: string }) {
    return this.octokit.request("GET /repos/{owner}/{repo}/git/ref/heads/{branch}", {
      owner,
      repo,
      branch,
    });
  }

  private async createBranchRefRequest({
    owner,
    repo,
    branch,
    sha,
  }: {
    owner: string;
    repo: string;
    branch: string;
    sha: string;
  }) {
    return this.octokit.request("POST /repos/{owner}/{repo}/git/refs", {
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha,
    });
  }

  private async getCommitRequest({ owner, repo, commitSha }: { owner: string; repo: string; commitSha: string }) {
    return this.octokit.request("GET /repos/{owner}/{repo}/git/commits/{commit_sha}", {
      owner,
      repo,
      commit_sha: commitSha,
    });
  }

  private async createBlobRequest({
    owner,
    repo,
    content,
    encoding,
  }: {
    owner: string;
    repo: string;
    content: string;
    encoding: string;
  }) {
    return this.octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
      owner,
      repo,
      content,
      encoding,
    });
  }

  private async createTreeRequest({
    owner,
    repo,
    baseTree,
    tree,
  }: {
    owner: string;
    repo: string;
    baseTree: string;
    tree: GithubTreeItem[];
  }) {
    return this.octokit.request("POST /repos/{owner}/{repo}/git/trees", {
      owner,
      repo,
      base_tree: baseTree,
      tree,
    });
  }

  private async createCommitRequest({
    owner,
    repo,
    message,
    tree,
    parentSha,
  }: {
    owner: string;
    repo: string;
    message: string;
    tree: string;
    parentSha?: string;
  }) {
    const params: any = {
      owner,
      repo,
      message,
      tree,
    };

    if (parentSha) {
      params.parents = [parentSha];
    }

    return this.octokit.request("POST /repos/{owner}/{repo}/git/commits", params);
  }

  private async updateBranchRefRequest({
    owner,
    repo,
    branch,
    sha,
  }: {
    owner: string;
    repo: string;
    branch: string;
    sha: string;
  }) {
    return this.octokit.request("PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}", {
      owner,
      repo,
      branch,
      sha,
      force: true,
    });
  }

  private async checkReposForUpdatesRequest({ etag, signal }: { etag: string | null; signal?: AbortSignal }) {
    return this.octokit.request("GET /user/repos", {
      per_page: 1,
      headers: { "If-None-Match": etag ?? undefined },
      request: { signal },
    });
  }

  async checkForUpdates(
    etag: string | null,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    try {
      const response = await this.checkReposForUpdatesRequest({ etag, signal });

      return { updated: true, newEtag: response.headers.etag || null };
    } catch (error: any) {
      if (error.status === 304) {
        return { updated: false, newEtag: etag };
      }
      if (isAbortError(error)) throw error;
      throw mapToTypedError(error);
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      if (isAbortError(error)) throw error;
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
