import type { CloudflareAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";

import Cloudflare from "cloudflare";
// import { CloudflareClient } from "@/lib/cloudflare/CloudflareClient";
//

// export class CloudflareClient2 {
//   private cf: Cloudflare;
//   private accountId: string;

//   constructor({ apiToken, apiKey, accountId }: { apiToken: string; apiKey: string; accountId: string }) {
//     this.cf = new Cloudflare({
//       apiToken,
//       apiKey,
//     });
//     this.accountId = accountId;
//   }
// }
export class RemoteAuthCloudflareAPIAgent implements RemoteAuthAgent {
  private _cloudflareClient!: Cloudflare;

  get cloudflareClient() {
    return (
      this._cloudflareClient ||
      (this._cloudflareClient = new Cloudflare({
        apiToken: this.getApiToken(),
      }))
    );
  }

  createProject(params: { name: string }, options: { signal?: AbortSignal } = {}) {
    return this.cloudflareClient;
  }

  getUsername(): string {
    return "cloudflare-api";
  }
  toProjectSearchAgent(): RemoteAuthAgentSearchType<any> {
    return {
      fetchAll: this.fetchAll.bind(this),
      hasUpdates: this.hasUpdates.bind(this),
    };
  }
  toAccountSearchAgent(): RemoteAuthAgentSearchType<any> {
    return {
      fetchAll: this.fetchAll.bind(this),
      hasUpdates: this.hasUpdates.bind(this),
    };
  }

  async fetchAll() {
    return []; //r2 buckets
  }
  async hasUpdates() {
    return { updated: true, newEtag: null };
  }

  deploy() {
    this.cloudflareClient;
  }

  getApiToken(): string {
    return this.remoteAuth.data.apiKey;
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    return { status: "success" };
  }

  constructor(private remoteAuth: CloudflareAPIRemoteAuthDAO) {}
}
