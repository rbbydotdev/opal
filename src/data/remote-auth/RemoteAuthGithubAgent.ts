import { GitHubClient, GitHubRepo } from "@/api/github/GitHubClient";
import { RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";

export abstract class RemoteAuthGithubAgent implements RemoteGitApiAgent {
  private _githubClient!: GitHubClient;
  get githubClient() {
    return (
      this._githubClient ||
      (this._githubClient = new GitHubClient(this.getApiToken()))
    );
  }

  onAuth = () => {
    return this.githubClient.getAuthCredentials(this.getApiToken());
  };
  async createRepo(repoName: string, { signal }: { signal?: AbortSignal } = {}) {
    return this.githubClient.createRepo(repoName, { signal });
  }
  async getRemoteUsername(): Promise<string> {
    const user = await this.githubClient.getCurrentUser();
    return user.login;
  }

  async fetchAll({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
    return this.githubClient.getRepos({ signal });
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
