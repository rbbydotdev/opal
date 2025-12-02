import type { CloudflareAPIRemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";

import Cloudflare from "cloudflare";
import { optionalCORSBaseURL } from "../lib/optionalCORSBaseURL";

export class RemoteAuthCloudflareAPIAgent implements RemoteAuthAgent {
  private _cloudflareClient!: Cloudflare;
  private _accountId: string | null = null;
  getAccountId() {
    return this._accountId;
  }
  setAccountId(accountId: string) {
    this._accountId = accountId;
  }

  get cf() {
    console.log(">>>>>>>>>>>>>>>>>", optionalCORSBaseURL(this.remoteAuth.data.corsProxy, "api.cloudflare.com"));
    // 'Access-Control-Allow-Headers': '*', // **Allows all headers**
    return (
      this._cloudflareClient ||
      (this._cloudflareClient = new Cloudflare({
        apiToken: this.getApiToken(),
        baseURL: optionalCORSBaseURL(this.remoteAuth.data.corsProxy, "api.cloudflare.com"),
      }))
    );
  }

  getUsername(): string {
    return "cloudflare-api";
  }
  toProjectSearchAgent(): RemoteAuthAgentSearchType<any> {
    return {
      fetchAll: this.fetchAllProjects.bind(this),
      hasUpdates: this.hasUpdates.bind(this),
    };
  }
  toAccountSearchAgent(): RemoteAuthAgentSearchType<any> {
    return {
      fetchAll: this.fetchAllAccounts.bind(this),
      hasUpdates: this.hasUpdates.bind(this),
    };
  }

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
    return { status: "success" };
  }

  constructor(private remoteAuth: CloudflareAPIRemoteAuthDAO) {}
  async fetchAllAccounts({ signal }: { signal?: AbortSignal } = {}) {
    const accounts = [];
    const res = await this.cf.accounts.list({ signal });
    for await (const page of res.iterPages()) {
      accounts.push(...page.result);
      if (signal?.aborted) break;
    }
    return accounts;
  }
  async fetchAllProjects({ signal }: { signal?: AbortSignal } = {}) {
    const projects = [];
    if (!this.getAccountId()) {
      return [];
    }
    const res = await this.cf.pages.projects.list(
      { account_id: this.getAccountId()! },
      {
        signal,
      }
    );
    for await (const page of res.iterPages()) {
      projects.push(...page.result);
      if (signal?.aborted) break;
    }
    return projects.map((project) => ({ name: project.project_name, accountId: this.getAccountId()! }));
  }
  createProject({ name }: { name: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.cf.pages.projects.create(
      {
        account_id: this.getAccountId()!,
        name,
      },
      { signal }
    );
  }
}
