import type {
  BasicAuthRemoteAuthDAO,
  CloudflareAPIRemoteAuthDAO,
  GithubAPIRemoteAuthDAO,
  GithubDeviceOAuthRemoteAuthDAO,
  GithubOAuthRemoteAuthDAO,
  NetlifyAPIRemoteAuthDAO,
  NetlifyOAuthRemoteAuthDAO,
} from "@/data/RemoteAuth";
import { IRemoteAuthAgent, IRemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { IRemoteAuthAgentSearch } from "@/data/useRemoteSearch";
import { NetlifyClient, NetlifySite } from "@/lib/netlify/NetlifyClient";
import { CloudflareClient } from "@/lib/cloudflare/CloudflareClient";
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

  async fetchAll({ signal }: { signal?: AbortSignal } = {}): Promise<Repo[]> {
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

      // Add defensive check for response.data
      if (!Array.isArray(response.data)) {
        console.error("GitHub API returned unexpected response format:", response.data);
        throw new Error(`GitHub API returned unexpected response format. Expected array, got: ${typeof response.data}`);
      }

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

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      await this.octokit.request("GET /user");
      return { status: "success" };
    } catch (error: any) {
      return { 
        status: "error", 
        msg: `GitHub API test failed: ${error.message || "Unknown error"}` 
      };
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
  async fetchAll(): Promise<Repo[]> {
    console.warn("RemoteAuthBasicAuthAgent.fetchAll() is not implemented");
    return [];
  }

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    console.warn("RemoteAuthBasicAuthAgent.hasUpdates() is not implemented");
    return Promise.resolve({ updated: false, newEtag: etag });
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    return { 
      status: "error", 
      msg: "Basic auth test not implemented" 
    };
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

export abstract class RemoteAuthNetlifyAgent implements IRemoteAuthAgent, IRemoteAuthAgentSearch<NetlifySite> {
  private _netlifyClient!: NetlifyClient;

  get netlifyClient() {
    return this._netlifyClient || (this._netlifyClient = new NetlifyClient(this.getApiToken()));
  }

  onAuth(): { username: string; password: string } {
    return {
      username: this.getUsername(),
      password: this.getApiToken(),
    };
  }

  fetchAll(options?: { signal?: AbortSignal }): Promise<NetlifySite[]> {
    return this.netlifyClient.getSites();
  }
  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    // Netlify API does not support ETag for sites, so we always return updated=true
    return Promise.resolve({ updated: true, newEtag: null });
  }

  async getRemoteUsername(): Promise<string> {
    const user = await this.netlifyClient.getCurrentUser();
    return user.full_name || user.email;
  }

  createSite = (siteName: string, { signal }: { signal?: AbortSignal } = {}) => {
    const finalSiteName = siteName.trim();
    return this.netlifyClient.createSite({ name: finalSiteName }, { signal });
  };

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      await this.netlifyClient.getCurrentUser();
      return { status: "success" };
    } catch (error: any) {
      return { 
        status: "error", 
        msg: `Netlify API test failed: ${error.message || "Unknown error"}` 
      };
    }
  }

  abstract getUsername(): string;
  abstract getApiToken(): string;
}

export class RemoteAuthNetlifyOAuthAgent extends RemoteAuthNetlifyAgent {
  getUsername(): string {
    return "netlify-oauth";
  }

  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  constructor(private remoteAuth: NetlifyOAuthRemoteAuthDAO) {
    super();
  }
}

export class RemoteAuthNetlifyAPIAgent extends RemoteAuthNetlifyAgent {
  getUsername(): string {
    return "netlify-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  constructor(private remoteAuth: NetlifyAPIRemoteAuthDAO) {
    super();
  }
}

export class RemoteAuthCloudflareAPIAgent implements IRemoteAuthAgent {
  private _cloudflareClient!: CloudflareClient;

  get cloudflareClient() {
    return this._cloudflareClient || (this._cloudflareClient = new CloudflareClient(this.getApiToken()));
  }

  onAuth(): { username: string; password: string } {
    return {
      username: this.getUsername(),
      password: this.getApiToken(),
    };
  }

  getUsername(): string {
    return "cloudflare-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      await this.cloudflareClient.verifyToken();
      return { status: "success" };
    } catch (error: any) {
      return { 
        status: "error", 
        msg: `Cloudflare API test failed: ${error.message || "Unknown error"}` 
      };
    }
  }

  constructor(private remoteAuth: CloudflareAPIRemoteAuthDAO) {}
}
