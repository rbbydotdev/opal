import type { CloudflareAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { CloudflareClient } from "@/lib/cloudflare/CloudflareClient";

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
