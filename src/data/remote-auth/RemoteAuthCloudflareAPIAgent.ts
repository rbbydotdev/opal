import { CloudflareClient } from "@/api/cloudflare/CloudflareClient";
import { CloudflareDestination } from "@/data/DestinationSchemaMap";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { DeployBundle } from "@/services/deploy/DeployBundle";
import type { CloudflareAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { optionalCORSBaseURL } from "../../lib/optionalCORSBaseURL";

export class RemoteAuthCloudflareAPIAgent implements RemoteAuthAgent {
  private _cloudflareClient!: CloudflareClient;
  private _accountName: string | null = null;
  private _accountId: string | null = null;

  getAccountId() {
    return this._accountId;
  }
  setAccountId(accountId: string) {
    this._accountId = accountId;
  }

  getAccountName() {
    return this._accountName;
  }
  setAccountName(accountName: string) {
    this._accountName = accountName;
  }

  async fetchAll() {
    console.warn("fetchAll not implemented for RemoteAuthCloudflareAPIAgent");
    return [];
  }

  fetchAccountIdByName = async (accountName: string, { signal }: { signal: AbortSignal }): Promise<string | null> => {
    return (await this.cloudflareClient.getAccountByName(accountName, { signal }))?.id || null;
  };

  get cloudflareClient() {
    return (
      this._cloudflareClient ||
      (this._cloudflareClient = new CloudflareClient({
        apiToken: this.getApiToken(),
        corsProxy: this.remoteAuth.data.corsProxy
      }))
    );
  }

  getUsername(): string {
    return "cloudflare-api";
  }
  async hasUpdates() {
    return { updated: true, newEtag: null };
  }

  deploy() {
    throw new Error("Method not implemented.");
  }

  private lastDeploymentResult: any = null;

  async deployFiles(
    bundle: DeployBundle,
    destination: CloudflareDestination,
    logStatus?: (status: string) => void
  ): Promise<unknown> {
    const files = await bundle.getFiles();
    const projectName = destination.meta.projectName;
    if (destination.meta.accountId) this.setAccountId(destination.meta.accountId);
    if (!this.getAccountId()) {
      throw new Error("Account ID is required for Cloudflare Pages deployment");
    }
    this.lastDeploymentResult = await this.cloudflareClient.deployToPages(this.getAccountId()!, projectName, files, { logStatus });
    return this.lastDeploymentResult;
  }

  async getDestinationURL(destination: CloudflareDestination): Promise<string> {
    const projectName = destination.meta.projectName;
    if (!projectName) {
      return "about:blank";
    }

    // Cloudflare Pages default URL format
    return `https://${projectName}.pages.dev`;
  }

  async getDeploymentURL(destination: CloudflareDestination): Promise<string> {
    if (this.lastDeploymentResult?.result?.url) {
      return this.lastDeploymentResult.result.url;
    } else if (this.lastDeploymentResult?.url) {
      return this.lastDeploymentResult.url;
    }
    // Fallback to destination URL if no deployment-specific URL available
    return this.getDestinationURL(destination);
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      const isValid = await this.cloudflareClient.verifyCredentials();
      if (isValid) {
        return { status: "success" };
      } else {
        return { status: "error", msg: "Invalid Cloudflare credentials" };
      }
    } catch (error: any) {
      return {
        status: "error",
        msg: `Cloudflare API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  constructor(private remoteAuth: CloudflareAPIRemoteAuthDAO) {}

  fetchAllAccounts = async ({ signal }: { signal?: AbortSignal } = {}) => {
    return this.cloudflareClient.getAccounts({ signal });
  };

  fetchAllProjects = async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!this.getAccountId()) return [];
    return this.cloudflareClient.getProjects(this.getAccountId()!, { signal });
  };
  createProject({ name }: { name: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.cloudflareClient.createProject(this.getAccountId()!, { name }, { signal });
  }

  AccountSearchAgent = {
    fetchAll: this.fetchAllAccounts,
    hasUpdates: this.hasUpdates,
  };
  ProjectSearchAgent = {
    fetchAll: this.fetchAllProjects,
    hasUpdates: this.hasUpdates,
  };
}
