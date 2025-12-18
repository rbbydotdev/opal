import { OctokitClient } from "@/auth/OctokitClient";
import { isAbortError, mapToTypedError } from "@/lib/errors/errors";
import { DeployBundleTreeEntry, UniversalDeployFile } from "@/services/deploy/DeployBundle";
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
      files: UniversalDeployFile[];
    },
    logStatus: (status: string) => void = () => {}
  ) {
    // Check if repo is empty first
    const { exists, reason } = await this.checkGetBranchRefRequest({ owner, repo, branch });

    if (!exists && reason === "unknown") {
      throw new Error("Unable to determine repository status");
    }

    // Handle empty repo case - use Contents API for first file
    if (!exists && reason === "emptyrepo") {
      if (files.length === 0) {
        throw new Error("Cannot deploy to empty repository with no files");
      }

      const firstFile = files[0]!;
      const firstFileContent = await firstFile.asBase64();

      logStatus(`Repository is empty. Creating first file '${firstFile.path}'...`);
      await this.createFileRequest({
        owner,
        repo,
        path: firstFile.path,
        message,
        content: firstFileContent,
        branch,
      });

      // If only one file, we're done
      if (files.length === 1) {
        logStatus(`Deploy completed successfully!`);
        return;
      }

      // Continue with remaining files using normal flow
      files = files.slice(1);
      logStatus(`Continuing with remaining ${files.length} files...`);
    }

    // Normal Git API flow (works for all cases now that repo has history)
    const { latestCommitSha, baseTreeSha, isOrphan } = await this.resolveBranchForDeploy({
      owner,
      repo,
      branch,
      logStatus,
    });

    const { newCommitSha } = await this.createDeployCommit({
      owner,
      repo,
      message: files.length < 3 ? message : `${message} (${files.length} files)`,
      files,
      baseTreeSha: isOrphan ? undefined : baseTreeSha,
      parentSha: isOrphan ? undefined : latestCommitSha,
      logStatus,
    });

    await this.updateOrCreateBranchRef({ owner, repo, branch, newCommitSha }, logStatus);
    logStatus(`Deploy completed successfully!`);
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
    message,
    files,
    baseTreeSha,
    parentSha,
    logStatus = () => {},
  }: {
    owner: string;
    repo: string;
    message: string;
    files: UniversalDeployFile[];
    baseTreeSha?: string;
    parentSha?: string;
    logStatus?: (status: string) => void;
  }): Promise<{ newCommitSha: string }> {
    const tree: GithubTreeItem[] = [];

    logStatus(`Creating blobs for ${files.length} files...`);
    for (const file of files) {
      const content = await file.asBase64();
      const {
        data: { sha },
      } = await this.createBlobRequest({ owner, repo, content, encoding: "base64" });

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

    return { newCommitSha };
  }

  private async updateOrCreateBranchRef(
    {
      owner,
      repo,
      branch,
      newCommitSha,
    }: {
      owner: string;
      repo: string;
      branch: string;
      newCommitSha: string;
    },
    logStatus: (status: string) => void = () => {}
  ) {
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
    encoding: "utf-8" | "base64";
  }) {
    return this.octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
      owner,
      repo,
      content,
      encoding,
    });
  }

  async getFullRepoName(repoName: string): Promise<[string, string]> {
    try {
      if (repoName.includes("/")) {
        return repoName.split("/") as [string, string];
      }
      const currentUser = await this.getCurrentUser();
      return [currentUser.login, repoName];
    } catch (e) {
      console.error("Error getting full repo name:", e);
      return ["unknown", "unknown"];
    }
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
      base_tree: (baseTree || null) as any,
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

  private async createFileRequest({
    owner,
    repo,
    path,
    message,
    content,
    branch,
  }: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    content: string;
    branch: string;
  }) {
    return this.octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      message,
      content,
      branch,
    });
  }

  private async checkGetBranchRefRequest({ owner, repo, branch }: { owner: string; repo: string; branch: string }) {
    try {
      await this.getBranchRefRequest({ owner, repo, branch });
      return {
        exists: true,
        error: null,
        reason: null,
      } as const;
    } catch (e: any) {
      const error = mapToTypedError(e);
      if (e.status === 422) {
        return {
          exists: false,
          error,
          reason: "nobranch",
        } as const;
      }
      if (e.status === 409) {
        return {
          exists: false,
          error,
          reason: "emptyrepo",
        } as const;
      }
      return {
        exists: false,
        error,
        reason: "unknown",
      } as const;
    }
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
