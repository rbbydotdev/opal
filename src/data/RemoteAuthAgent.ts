import type {
  BasicAuthRemoteAuthDAO,
  GithubAPIRemoteAuthDAO,
  GithubDeviceOAuthRemoteAuthDAO,
  GithubOAuthRemoteAuthDAO,
} from "@/data/RemoteAuth";
import { Octokit } from "@octokit/core";

export interface IRemoteAuthAgent {
  getUsername(): string;
  getApiToken(): string;
  onAuth(): { username: string; password: string };
}

export abstract class IRemoteAuthGithubAgent implements IRemoteAuthAgent {
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

export class RemoteAuthBasicAuthAgent implements IRemoteAuthAgent {
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
}

export class RemoteAuthGithubOAuthAgent extends IRemoteAuthGithubAgent {
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

export class RemoteAuthGithubAPIAgent extends IRemoteAuthGithubAgent {
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
export class RemoteAuthGithubDeviceOAuthAgent extends IRemoteAuthGithubAgent {
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

export interface Repo {
  id: string | number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  updated_at: Date;
}
export interface IGitProviderAgent {
  getRepos(options?: { signal?: AbortSignal }): Promise<Repo[]>;

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }>;
}
