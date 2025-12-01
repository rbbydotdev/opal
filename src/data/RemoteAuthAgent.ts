import type {
  AWSAPIRemoteAuthDAO,
  BasicAuthRemoteAuthDAO,
  CloudflareAPIRemoteAuthDAO,
  GithubAPIRemoteAuthDAO,
  GithubDeviceOAuthRemoteAuthDAO,
  GithubOAuthRemoteAuthDAO,
  NetlifyAPIRemoteAuthDAO,
  NetlifyOAuthRemoteAuthDAO,
  VercelAPIRemoteAuthDAO,
  VercelOAuthRemoteAuthDAO,
} from "@/data/RemoteAuthDAO";
import { RemoteAuthAgent, RemoteAuthAgentCORS, RemoteGitApiAgent, Repo } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { AWSS3Bucket, AWSS3Client } from "@/lib/aws/AWSClient";
import { CloudflareClient } from "@/lib/cloudflare/CloudflareClient";
import { NetlifyClient, NetlifySite } from "@/lib/netlify/NetlifyClient";
import { Octokit } from "@octokit/core";
import { Vercel } from "@vercel/sdk";
import { GetProjectsProjects } from "@vercel/sdk/models/getprojectsop.js";
import { Mutex } from "async-mutex";

export type VercelProject = GetProjectsProjects;

function Reauther<T extends object>(
  clientFactory: () => T,
  checkAuth: () => Promise<boolean> | boolean,
  reauth: () => Promise<void> | void
): T {
  const mutex = new Mutex();
  let client: T | null = null;
  let isReauthing = false;

  return new Proxy({} as T, {
    get(target, prop, receiver) {
      const originalClient = client || (client = clientFactory());
      const value = (originalClient as any)[prop];

      if (typeof value === "function") {
        return async function (...args: any[]) {
          const release = await mutex.acquire();
          try {
            if (!isReauthing) {
              const isExpired = !(await checkAuth());
              if (isExpired) {
                isReauthing = true;
                await reauth();
                client = clientFactory();
                isReauthing = false;
              }
            }
            const currentClient = client || originalClient;
            return await (currentClient as any)[prop].apply(currentClient, args);
          } finally {
            release();
          }
        };
      }

      if (typeof value === "object" && value !== null) {
        return new Proxy(value, {
          get(nestedTarget, nestedProp) {
            const nestedValue = (nestedTarget as any)[nestedProp];
            if (typeof nestedValue === "function") {
              return async function (...args: any[]) {
                const release = await mutex.acquire();
                try {
                  if (!isReauthing) {
                    const isExpired = !(await checkAuth());
                    if (isExpired) {
                      isReauthing = true;
                      await reauth();
                      client = clientFactory();
                      isReauthing = false;
                    }
                  }
                  const currentClient = client || originalClient;
                  const currentNestedTarget = (currentClient as any)[prop];
                  return await currentNestedTarget[nestedProp].apply(currentNestedTarget, args);
                } finally {
                  release();
                }
              };
            }
            return nestedValue;
          }
        });
      }

      return value;
    }
  });
}

export abstract class RemoteAuthGithubAgent implements RemoteGitApiAgent {
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
        per_page: 50,
        affiliation: "owner,collaborator",
        headers: {
          "If-None-Match": "", // Force fresh response, bypass browser cache
        },
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
        msg: `GitHub API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  abstract getUsername(): string;
  abstract getApiToken(): string;
}

export class RemoteAuthBasicAuthAgent implements RemoteGitApiAgent {
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
      msg: "Basic auth test not implemented",
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

export abstract class RemoteAuthNetlifyAgent implements RemoteAuthAgent, RemoteAuthAgentSearchType<NetlifySite> {
  private _netlifyClient!: NetlifyClient;

  get netlifyClient() {
    return this._netlifyClient || (this._netlifyClient = new NetlifyClient(this.getApiToken()));
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
        msg: `Netlify API test failed: ${error.message || "Unknown error"}`,
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
export abstract class RemoteAuthVercelAgent implements RemoteAuthAgentCORS, RemoteAuthAgentSearchType<VercelProject> {
  private _vercelClient!: Vercel;

  // serverURL: this.getCORSProxy() ? `${stripTrailingSlash(this.getCORSProxy()!)}/api.vercel.com` : undefined,
  get vercelClient(): Vercel {
    return (
      this._vercelClient ||
      (this._vercelClient = Reauther(
        () => new Vercel({
          bearerToken: this.getApiToken(),
        }),
        () => this.checkAuth(),
        () => this.reauth()
      ))
    );
  }

  async getCurrentUser({ signal }: { signal?: AbortSignal } = {}) {
    return await this.vercelClient.user.getAuthUser({ signal, mode: "cors" }).then((res) => res.user);
  }

  async createProject(params: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercelClient.projects.createProject(params, { signal, mode: "cors" });
  }

  async getProject(projectId: string, teamId?: string, { signal }: { signal?: AbortSignal } = {}) {
    return (await this.vercelClient.projects.getProjects({ teamId }, { signal, mode: "cors" })).projects.find(
      (p) => p.id === projectId
    )!;
  }

  async getAllProjects({ teamId }: { teamId?: string } = {}, { signal }: { signal?: AbortSignal } = {}) {
    let continueToken: number | null = null;
    const results: VercelProject[] = [];
    do {
      const projects = await this.vercelClient.projects
        //@ts-ignore
        .getProjects(
          { teamId, from: continueToken !== null ? continueToken : undefined, limit: "100" },
          { signal, mode: "cors" }
        )
        .then((res) => {
          continueToken = res.pagination.next as number;
          return res.projects;
        });
      results.push(...projects);
    } while (continueToken);
    return results;
  }

  async fetchAll(options?: { signal?: AbortSignal }): Promise<VercelProject[]> {
    return this.getAllProjects();
  }

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    return Promise.resolve({ updated: true, newEtag: null });
  }

  async getRemoteUsername(): Promise<string> {
    const user = await this.getCurrentUser();
    return user.name || user.username || user.email;
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      await this.getCurrentUser();
      return { status: "success" };
    } catch (error: any) {
      return {
        status: "error",
        msg: `Vercel API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  checkAuth(): Promise<boolean> | boolean {
    return true; // Default: assume auth is valid
  }

  reauth(): Promise<void> | void {
    // Default: no reauth needed
  }

  abstract getCORSProxy(): string | undefined;
  abstract getUsername(): string;
  abstract getApiToken(): string;
}

export class RemoteAuthVercelAPIAgent extends RemoteAuthVercelAgent {
  getCORSProxy(): string | undefined {
    return this.remoteAuth.data.corsProxy || undefined;
  }

  getUsername(): string {
    return "vercel-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  constructor(private remoteAuth: VercelAPIRemoteAuthDAO) {
    super();
  }
}

export class RemoteAuthVercelOAuthAgent extends RemoteAuthVercelAgent {
  getCORSProxy(): string | undefined {
    return this.remoteAuth.data.corsProxy || undefined;
  }

  getUsername(): string {
    return "vercel-oauth";
  }

  getApiToken(): string {
    return this.remoteAuth.data.accessToken;
  }

  async checkAuth(): Promise<boolean> {
    if (!this.remoteAuth.data.accessToken) return false;
    const expiresAt = this.remoteAuth.data.obtainedAt + (this.remoteAuth.data.expiresIn * 1000);
    if (Date.now() >= expiresAt) {
      return false;
    }
    return true;
  }

  async reauth(): Promise<void> {
    if (!this.remoteAuth.data.refreshToken) {
      throw new Error("No refresh token available for reauthentication");
    }
    // TODO: Implement token refresh logic
    // This would typically involve calling the OAuth provider's token endpoint
    // with the refresh token to get a new access token
    console.warn("Token refresh not implemented yet");
  }

  constructor(private remoteAuth: VercelOAuthRemoteAuthDAO) {
    super();
  }
}

export class RemoteAuthCloudflareAPIAgent implements RemoteAuthAgent {
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
        msg: `Cloudflare API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  constructor(private remoteAuth: CloudflareAPIRemoteAuthDAO) {}
}

export class RemoteAuthAWSAPIAgent implements RemoteAuthAgent, RemoteAuthAgentSearchType<AWSS3Bucket> {
  private _s3Client!: AWSS3Client;
  private region: string = "us-east-1";

  get s3Client() {
    if (!this._s3Client) {
      this.initClient();
    }
    return this._s3Client;
  }
  private initClient() {
    return (this._s3Client = new AWSS3Client({
      accessKeyId: this.remoteAuth.data.apiKey,
      secretAccessKey: this.remoteAuth.data.apiSecret!,
      region: this.region,
      corsProxy: this.remoteAuth.data.corsProxy,
    }));
  }

  setRegion(region: string) {
    if (this.region === region) return this;
    this.region = region;
    this.initClient();
    return this;
  }

  getUsername(): string {
    return "aws-api";
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  getSecretKey(): string {
    return this.remoteAuth.data.apiSecret || "";
  }

  async fetchAll(options?: { signal?: AbortSignal }): Promise<AWSS3Bucket[]> {
    return this.s3Client.listBuckets();
  }

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    // S3 doesn't support ETag for bucket lists, so we always return updated=true
    return Promise.resolve({ updated: true, newEtag: null });
  }

  createBucket = async (bucketName: string, { signal }: { signal?: AbortSignal } = {}) => {
    return this.s3Client.createBucket(bucketName);
  };

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      const isValid = await this.s3Client.verifyCredentials();
      if (isValid) {
        return { status: "success" };
      } else {
        return { status: "error", msg: "AWS credentials validation failed" };
      }
    } catch (error: any) {
      return {
        status: "error",
        msg: `AWS API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  constructor(private remoteAuth: AWSAPIRemoteAuthDAO) {}
}
