import { GitHubClient } from "@/api/github/GitHubClient";
import { GithubDestination } from "@/data/DestinationSchemaMap";
import { RemoteAuthAgentDeployableFiles } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { relPath, stripLeadingSlash } from "@/lib/paths2";
import { DeployBundle } from "@/services/deploy/DeployBundle";

export abstract class RemoteAuthGithubAgent implements RemoteGitApiAgent, RemoteAuthAgentDeployableFiles<DeployBundle> {
  private _githubClient!: GitHubClient;
  get githubClient() {
    return this._githubClient || (this._githubClient = new GitHubClient(this.getApiToken()));
  }

  async getDestinationURL(destination: GithubDestination) {
    const repoName = coerceGithubRepoToName(destination.meta.repository);
    const [owner, repo] = await this.githubClient.getFullRepoName(repoName);
    return `https://${owner}.github.io/${repo}`;
  }

  onAuth = () => {
    return this.githubClient.getAuthCredentials(this.getUsername(), this.getApiToken());
  };
  async createRepo(
    { repoName, private: isPrivate }: { repoName: string; private?: boolean },
    { signal }: { signal?: AbortSignal } = {}
  ) {
    return this.githubClient.createRepo({ repoName: coerceGithubRepoToName(repoName), private: isPrivate }, { signal });
  }
  async getRemoteUsername(): Promise<string> {
    const user = await this.githubClient.getCurrentUser();
    return user.login;
  }

  async fetchAll({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
    return this.githubClient.getRepos({ signal });
  }

  async deployFiles(
    bundle: DeployBundle,
    destination: GithubDestination,
    logStatus?: (status: string) => void,
    signal?: AbortSignal
  ) {
    const files = await bundle.getFiles();
    const { repository, branch } = destination.meta;
    const repoName = coerceGithubRepoToName(repository);
    const [owner, repo] = await this.githubClient.getFullRepoName(repoName);

    // Check if the GitHub client already has methods with signal support
    // and combine with any internal signals using AbortSignal.any if needed
    return this.githubClient.deploy(
      {
        owner,
        repo,
        branch,
        files,
        message: "publish deploy",
      },
      logStatus,
      signal
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

export function coerceGithubRepoToName(repoName: string): string {
  // If a full URL is provided, extract the path part
  try {
    const url = new URL(repoName);
    return stripLeadingSlash(url.pathname.replace(/\.git$/, "")).trim();
  } catch {}
  // If not a URL, clean up the path and take first two segments (owner/repo)
  return stripLeadingSlash(repoName).split("/").slice(0, 2).join("/");
}

export function coerceGitHubRepoToURL(repoName: string): string {
  // If it's already a URL, return as is
  try {
    return `https://github.com/${coerceGithubRepoToName(new URL(repoName).pathname)}`;
  } catch {}
  return `https://github.com/${coerceGithubRepoToName(repoName)}`;
}
