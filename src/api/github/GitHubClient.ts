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

export type GithubTreeItem = {
  path?: string;
  mode?: "100644" | "100755" | "040000" | "160000" | "120000";
  type?: "blob" | "tree" | "commit";
  sha?: string | null;
  content?: string;
};

export interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
  bio?: string;
}

export interface GitHubFileContent {
  path: string;
  content: string;
}

export type GithubInlinedFile = Extract<DeployBundleTreeEntry, { type: "file" }>;

export class GitHubClient {
  private octokit: Octokit;

  constructor(auth: string | null = null) {
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
      const error = mapToTypedError(e);

      if (error.code === 401) {
        error.hint("Authentication failed. Please check your GitHub token or re-authenticate.");
      } else if (error.code === 403) {
        error.hint("GitHub API rate limit exceeded. Please wait or use an authenticated token for higher limits.");
      } else {
        error.hint(tryParseGitHubError(e));
      }

      throw error;
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
      const finalRepoName = repoName.trim().split("/").pop()!;
      return await this.octokit.request("POST /user/repos", {
        name: finalRepoName,
        private: isPrivate ?? true, // Default to private if not specified
        auto_init: false,
        request: {
          signal,
        },
      });
    } catch (e) {
      const error = mapToTypedError(e);
      error.hint(tryParseGitHubError(e));
      throw error;
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
          console.error("GitHub API returned unexpected response format:", response.data);
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
    log: (status: string) => void = () => {},
    signal?: AbortSignal
  ) {
    signal?.throwIfAborted();

    // First check if the repository exists
    await this.verifyRepositoryExists({ owner, repo });

    // Check if repo is empty first
    const { exists, reason } = await this.checkGetBranchRefRequest({ owner, repo, branch });

    if (!exists && reason === "nobranch") {
      log(`Branch '${branch}' does not exist. It will be created during deploy.`);
    }

    if (!exists && reason === "unknown") {
      throw new Error("Unable to determine repository status");
    }

    // Handle empty repo case - use Contents API for first file
    if (!exists && reason === "emptyrepo") {
      signal?.throwIfAborted();

      if (files.length === 0) {
        throw new Error("Cannot deploy to empty repository with no files");
      }

      const firstFile = files[0]!;
      const firstFileContent = await firstFile.asBase64();

      log(`Repository is empty. Creating first file '${firstFile.path}'...`);
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
        log(`Deploy completed successfully!`);
        return;
      }

      // Continue with remaining files using normal flow
      files = files.slice(1);
      log(`Continuing with remaining ${files.length} files...`);
    }

    // Normal Git API flow (works for all cases now that repo has history)
    const { latestCommitSha, baseTreeSha, isOrphan } = await this.resolveBranchForDeploy({
      owner,
      repo,
      branch,
      log: log,
      signal,
    });

    const { newCommitSha } = await this.createDeployCommit({
      owner,
      repo,
      message: files.length < 3 ? message : `${message} (${files.length} files)`,
      files,
      baseTreeSha: isOrphan ? undefined : baseTreeSha,
      parentSha: isOrphan ? undefined : latestCommitSha,
      log: log,
      signal,
    });

    await this.updateOrCreateBranchRef({ owner, repo, branch, newCommitSha }, log);
    log(`Deploy completed successfully!`);
  }

  private async resolveBranchForDeploy({
    owner,
    repo,
    branch,
    log: log = () => {},
    signal,
  }: {
    owner: string;
    repo: string;
    branch: string;
    log?: (status: string) => void;
    signal?: AbortSignal;
  }) {
    try {
      log(`Checking if branch '${branch}' exists...`);
      const {
        data: {
          object: { sha },
        },
      } = await this.getBranchRefRequest({ owner, repo, branch, signal });

      const {
        data: {
          tree: { sha: baseTreeSha },
        },
      } = await this.getCommitRequest({ owner, repo, commitSha: sha, signal });

      log(`Found existing branch '${branch}'`);
      return { latestCommitSha: sha, baseTreeSha, isOrphan: false };
    } catch (e) {
      const error = mapToTypedError(e);
      console.log("Error checking branch ref:", error);
      if (error.code === 404) {
        // Branch doesn't exist, create as orphan (no parent)
        log(`Branch '${branch}' not found, will create as orphan branch`);
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
    log: log = () => {},
    signal,
  }: {
    owner: string;
    repo: string;
    message: string;
    files: UniversalDeployFile[];
    baseTreeSha?: string;
    parentSha?: string;
    log?: (status: string) => void;
    signal?: AbortSignal;
  }): Promise<{ newCommitSha: string }> {
    const tree: GithubTreeItem[] = [];

    log(`Creating blobs for ${files.length} files...`);
    for (const file of files) {
      const content = await file.asBase64();
      const {
        data: { sha },
      } = await this.createBlobRequest({ owner, repo, content, encoding: "base64", signal });

      tree.push({ path: file.path, mode: "100644", type: "blob", sha });
    }

    log(`Creating tree with ${tree.length} files...`);
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

    log(`Creating commit: "${message}"...`);
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
    log: (status: string) => void = () => {}
  ) {
    try {
      log(`Updating branch '${branch}' (force push)...`);
      await this.updateBranchRefRequest({ owner, repo, branch, sha: newCommitSha });
    } catch (error: any) {
      if (error.status === 422) {
        // Branch doesn't exist, create it
        log(`Creating new branch '${branch}'...`);
        await this.createBranchRefRequest({ owner, repo, branch, sha: newCommitSha });
      } else {
        throw error;
      }
    }
  }

  private async getBranchRefRequest({
    owner,
    repo,
    branch,
    signal,
  }: {
    owner: string;
    repo: string;
    branch: string;
    signal?: AbortSignal;
  }) {
    return this.octokit.request("GET /repos/{owner}/{repo}/git/ref/heads/{branch}", {
      owner,
      repo,
      branch,
      request: { signal },
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

  private async getCommitRequest({
    owner,
    repo,
    commitSha,
    signal,
  }: {
    owner: string;
    repo: string;
    commitSha: string;
    signal?: AbortSignal;
  }) {
    return this.octokit.request("GET /repos/{owner}/{repo}/git/commits/{commit_sha}", {
      owner,
      repo,
      commit_sha: commitSha,
      request: { signal },
    });
  }

  private async createBlobRequest({
    owner,
    repo,
    content,
    encoding,
    signal,
  }: {
    owner: string;
    repo: string;
    content: string;
    encoding: "utf-8" | "base64";
    signal?: AbortSignal;
  }) {
    return this.octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
      owner,
      repo,
      content,
      encoding,
      request: { signal },
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
      if (e.status === 404 || e.status === 422) {
        // Since we verified the repo exists, both 404 and 422 mean the branch doesn't exist
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
      console.error("Error verifying GitHub credentials:", error);
      return false;
    }
  }

  getAuthCredentials(username: string, apiToken: string) {
    return {
      username,
      password: apiToken,
    };
  }

  async verifyRepositoryExists({ owner, repo }: { owner: string; repo: string }) {
    try {
      await this.octokit.request("GET /repos/{owner}/{repo}", { owner, repo });
    } catch (e) {
      const error = mapToTypedError(e, {
        message: `Repository ${owner}/${repo} not found`,
        path: `${owner}/${repo}`,
      });

      if (error.code === 404) {
        error.hint(
          `Repository ${owner}/${repo} does not exist. Please check the repository name and ensure you have access to it.`
        );
      } else if (error.code === 403) {
        error.hint(`GitHub API rate limit exceeded. Please wait or authenticate to continue.`);
      } else if (error.code === 401) {
        error.hint(`Authentication failed. Please check your credentials.`);
      } else {
        error.hint(tryParseGitHubError(e));
      }

      throw error;
    }
  }

  async getRepositoryTree(
    { owner, repo, branch = "main" }: { owner: string; repo: string; branch?: string },
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<GitHubTreeItem[]> {
    try {
      const response = await this.octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
        owner,
        repo,
        tree_sha: branch,
        recursive: "1",
        request: { signal },
      });

      return response.data.tree
        .filter((item: any) => item.type === "blob")
        .map((item: any) => ({
          path: item.path,
          type: item.type as "blob" | "tree",
          sha: item.sha,
          size: item.size,
        }));
    } catch (e) {
      if (isAbortError(e)) throw e;
      console.error(e);
      throw mapToTypedError(e, {
        message: `Failed to fetch repository tree for ${owner}/${repo}`,
        path: `${owner}/${repo}`,
      });
    }
  }

  async getFileContent(
    { owner, repo, path, branch = "main" }: { owner: string; repo: string; path: string; branch?: string },
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<string> {
    try {
      const response = await this.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path,
        ref: branch,
        request: { signal },
      });

      // Handle the case where the content is base64 encoded
      const data = response.data as any;
      if (data.encoding === "base64" && data.content) {
        // Use proper UTF-8 decoding instead of atob to preserve emojis and Unicode
        const base64Content = data.content.replace(/\s/g, "");
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
      }

      return data.content || "";
    } catch (e) {
      if (isAbortError(e)) throw e;
      throw mapToTypedError(e, {
        message: `Failed to fetch file content for ${path} in ${owner}/${repo}`,
        path: `${owner}/${repo}/${path}`,
      });
    }
  }

  async *fetchRepositoryFiles(
    { owner, repo, branch = "main" }: { owner: string; repo: string; branch?: string },
    { signal }: { signal?: AbortSignal } = {}
  ): AsyncGenerator<{ path: string; content: string }> {
    try {
      const files = await this.getRepositoryTree({ owner, repo, branch }, { signal });

      for (const file of files) {
        signal?.throwIfAborted();

        try {
          const content = await this.getFileContent({ owner, repo, path: file.path, branch }, { signal });
          yield { path: file.path, content };
        } catch (error) {
          console.warn(`Error fetching ${file.path}:`, error);
        }
      }
    } catch (e) {
      if (isAbortError(e)) throw e;
      const error = mapToTypedError(e, {
        message: `Failed to fetch repository content for ${owner}/${repo}`,
        path: `${owner}/${repo}`,
      });

      // Add specific hints based on status codes
      if (error.code === 404) {
        error.hint(
          `Repository ${owner}/${repo} not found or branch ${branch} does not exist. Please check the repository name and branch.`
        );
      } else if (error.code === 409) {
        error.hint(`Repository ${owner}/${repo} appears to be empty on ${branch} branch.`);
      } else if (error.code === 422) {
      } else if (error.code === 403) {
        error.hint(
          `GitHub API rate limit exceeded. Authenticated requests get a higher rate limit. Please wait or authenticate to continue.`
        );
      } else if (error.code === 401) {
        error.hint(`Authentication failed. Please check your credentials.`);
      } else {
        error.hint(tryParseGitHubError(e));
      }
      throw error;
    }
  }
}

/*
{
  "message": "Repository creation failed.",
  "errors": [
    {
      "resource": "Repository",
      "code": "custom",
      "field": "name",
      "message": "name already exists on this account"
    }
  ],
  "documentation_url": "https://docs.github.com/rest/repos/repos#create-a-repository-for-the-authenticated-user",
  "status": "422"
}
*/
export function tryParseGitHubError(error: unknown): string | null {
  try {
    // Handle the case when Octokit passes an object (not a raw string)
    const parsed =
      typeof error === "string"
        ? JSON.parse(error)
        : typeof error === "object" && error !== null
          ? ((error as any).response?.data ?? error)
          : null;

    if (!parsed || typeof parsed !== "object") return null;

    const message = parsed.message as string | undefined;
    const errors = parsed.errors as
      | Array<{
          resource?: string;
          field?: string;
          message?: string;
        }>
      | undefined;

    if (Array.isArray(errors) && errors.length > 0) {
      // Build readable multi-line or single-line summary
      return errors.map((e) => `${e.resource ?? "Unknown"} - ${e.message ?? message ?? ""}`).join("\n");
    }

    // Some GitHub errors contain only top-level message
    return message ?? null;
  } catch {
    return null;
  }
}
