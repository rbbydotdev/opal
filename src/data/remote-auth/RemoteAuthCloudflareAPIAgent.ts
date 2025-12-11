import { CloudflareClient } from "@/api/cloudflare/CloudflareClient";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import type { CloudflareAPIRemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { optionalCORSBaseURL } from "../../lib/optionalCORSBaseURL";

export class RemoteAuthCloudflareAPIAgent implements RemoteAuthAgent {
  private _cloudflareClient!: CloudflareClient;
  private _accountId: string | null = null;
  getAccountId() {
    return this._accountId;
  }
  setAccountId(accountId: string) {
    this._accountId = accountId;
  }

  get cloudflareClient() {
    return (
      this._cloudflareClient ||
      (this._cloudflareClient = new CloudflareClient(
        this.getApiToken(),
        optionalCORSBaseURL(this.remoteAuth.data.corsProxy, "https://api.cloudflare.com/client/v4")
      ))
    );
  }

  getUsername(): string {
    return "cloudflare-api";
  }
  // toProjectSearchAgent() {
  //   return {
  //     fetchAll: this.fetchAllProjects,
  //     hasUpdates: this.hasUpdates,
  //   };
  // }
  // toAccountSearchAgent() {
  //   return {
  //     fetchAll: this.fetchAllAccounts,
  //     hasUpdates: this.hasUpdates,
  //   };
  // }

  async hasUpdates() {
    return { updated: true, newEtag: null };
  }

  deploy() {
    throw new Error("Method not implemented.");
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
    if (!this.getAccountId()) {
      return [];
    }
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
