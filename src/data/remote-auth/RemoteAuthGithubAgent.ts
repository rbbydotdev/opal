import { GitHubClient, GithubInlinedFile } from "@/api/github/GitHubClient";
import { RemoteAuthAgentDeployableFiles } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { relPath } from "@/lib/paths2";
import { DeployBundle } from "@/services/deploy/DeployBundle";

export function coerceRepoToName(repoName: string): string {
  // If a full URL is provided, extract the path part
  try {
    const url = new URL(repoName);
    return relPath(url.pathname.replace(/\.git$/, "")).trim();
  } catch {}
  return repoName;
}
export abstract class RemoteAuthGithubAgent
  implements RemoteGitApiAgent, RemoteAuthAgentDeployableFiles<DeployBundle<GithubInlinedFile>>
{
  private _githubClient!: GitHubClient;
  get githubClient() {
    return this._githubClient || (this._githubClient = new GitHubClient(this.getApiToken()));
  }

  getDestinationURL(destination: any): string {
    return `https://${destination.meta.owner}.github.io/${destination.meta.repository}`;
  }

  onAuth = () => {
    return this.githubClient.getAuthCredentials(this.getUsername(), this.getApiToken());
  };
  async createRepo(
    { repoName, private: isPrivate }: { repoName: string; private?: boolean },
    { signal }: { signal?: AbortSignal } = {}
  ) {
    return this.githubClient.createRepo({ repoName: coerceRepoToName(repoName), private: isPrivate }, { signal });
  }
  async getRemoteUsername(): Promise<string> {
    const user = await this.githubClient.getCurrentUser();
    return user.login;
  }

  async fetchAll({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
    return this.githubClient.getRepos({ signal });
  }

  async deployFiles(bundle: DeployBundle<GithubInlinedFile>, destination: any, logStatus?: (status: string) => void) {
    const files = await bundle.getFiles();
    const { repository, branch } = destination.meta;
    const [owner, repo] = await this.githubClient.getFullRepoName(repository);
    return this.githubClient.deploy(
      {
        owner,
        repo,
        branch,
        files,
        message: "publish deploy",
      },
      logStatus
    );
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
