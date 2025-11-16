import type {
  BasicAuthRemoteAuthDAO,
  GithubAPIRemoteAuthDAO,
  GithubDeviceOAuthRemoteAuthDAO,
  GithubOAuthRemoteAuthDAO,
} from "@/data/RemoteAuth";
import { IRemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { Octokit } from "@octokit/core";

export abstract class RemoteAuthGithubAgent implements IRemoteGitApiAgent {
  private _octokit!: Octokit;
  get octokit() {
    return (
      this._octokit ||
      (this._octokit = new Octokit({
        auth: this.getApiToken(),
      }))
    );
  }

  onAuth = () => {
    return {
      username: this.getUsername(),
      password: this.getApiToken(),
    };
  };
  async createRepo(repoName: string, { signal }: { signal?: AbortSignal } = {}) {
    const finalRepoName = repoName.trim();
    return this.octokit.request("POST /user/repos", {
      name: finalRepoName,
      private: true,
      auto_init: false,
      request: {
        signal,
      },
    });
  }
  async getRemoteUsername(): Promise<string> {
    const user = await this.octokit.request("GET /user");
    return user.data.login;
  }
  async getRepos({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
    const allRepos: Repo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.octokit.request("GET /user/repos", {
        page,
        per_page: 100,
        affiliation: "owner,collaborator",
        request: { signal },
      });

      allRepos.push(
        ...response.data.map(({ updated_at, id, name, full_name, description, html_url }) => ({
          updated_at: new Date(updated_at ?? Date.now()),
          id,
          name,
          full_name,
          description,
          html_url,
        }))
      );

      hasMore = response.data.length === 100;
      page++;
    }

    return allRepos;
  }

  async hasUpdates(
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
      throw error;
    }
  }

  abstract getUsername(): string;
  abstract getApiToken(): string;
}

export class RemoteAuthBasicAuthAgent implements IRemoteGitApiAgent {
  getUsername(): string {
    return this.remoteAuth.data.username;
  }
  getApiToken(): string {
    return this.remoteAuth.data.password;
  }
  constructor(private remoteAuth: BasicAuthRemoteAuthDAO) {}
  onAuth(): { username: string; password: string } {
    return {
      username: this.getUsername(),
      password: this.getApiToken(),
    };
  }
  async getRepos(): Promise<Repo[]> {
    console.warn("RemoteAuthBasicAuthAgent.getRepos() is not implemented");
    return [];
  }
  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    console.warn("RemoteAuthBasicAuthAgent.hasUpdates() is not implemented");
    return Promise.resolve({ updated: false, newEtag: etag });
  }
}
// IGitProviderAgent
export class RemoteAuthGithubOAuthAgent extends RemoteAuthGithubAgent {
  getUsername(): string {
    return "x-access-token";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: GithubOAuthRemoteAuthDAO) {
    super();
  }
}

export class RemoteAuthGithubAPIAgent extends RemoteAuthGithubAgent {
  getUsername = () => {
    return "x-access-token";
  };
  getApiToken = () => {
    return this.remoteAuth.data.apiKey;
  };
  constructor(private remoteAuth: GithubAPIRemoteAuthDAO) {
    super();
  }
}
export class RemoteAuthGithubDeviceOAuthAgent extends RemoteAuthGithubAgent {
  getUsername(): string {
    return "x-access-token";
  }
  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: GithubDeviceOAuthRemoteAuthDAO) {
    super();
  }
}
