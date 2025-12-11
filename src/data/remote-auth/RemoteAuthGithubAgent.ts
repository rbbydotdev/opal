import { GitHubClient, GithubInlinedFile } from "@/api/github/GitHubClient";
import { RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { DeployBundle } from "@/services/deploy/DeployBundle";

export abstract class RemoteAuthGithubAgent implements RemoteGitApiAgent {
  private _githubClient!: GitHubClient;
  get githubClient() {
    return this._githubClient || (this._githubClient = new GitHubClient(this.getApiToken()));
  }

  onAuth = () => {
    return this.githubClient.getAuthCredentials(this.getUsername(), this.getApiToken());
  };
  async createRepo(repoName: string, { signal }: { signal?: AbortSignal } = {}) {
    const resolvedRepoName = (() => {
      try {
        const url = new URL(repoName);
        return url.pathname.replace(/\.git$/, "");
      } catch {}
      return repoName;
    })();
    return this.githubClient.createRepo(resolvedRepoName, { signal });
  }
  async getRemoteUsername(): Promise<string> {
    const user = await this.githubClient.getCurrentUser();
    return user.login;
  }

  async fetchAll({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
    return this.githubClient.getRepos({ signal });
  }

  async deployFiles(
    bundle: DeployBundle<GithubInlinedFile>,
    {
      branch,
      owner,
      repo,
      message = "publsih deploy",
    }: { branch: string; owner: string; repo: string; message?: string }
  ) {
    const files = await bundle.getFiles();
    return this.githubClient.deploy({
      owner,
      repo,
      branch,
      files,
      message,
    });
  }

  async hasUpdates(
    etag: string | null,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    return this.githubClient.checkForUpdates(etag, { signal });
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      const isValid = await this.githubClient.verifyCredentials();
      if (isValid) {
        return { status: "success" };
      } else {
        return { status: "error", msg: "Invalid GitHub credentials" };
      }
    } catch (error: any) {
      return {
        status: "error",
        msg: `GitHub API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  abstract getUsername(): string;
  abstract getApiToken(): string;
}
