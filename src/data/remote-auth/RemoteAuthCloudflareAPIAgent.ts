import type { CloudflareAPIRemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";

import { mapToTypedError } from "@/lib/errors";
import Cloudflare, { APIError } from "cloudflare";
import { V4PagePaginationArray } from "cloudflare/pagination.mjs";
import { optionalCORSBaseURL } from "../../lib/optionalCORSBaseURL";

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
    return (
      this._cloudflareClient ||
      (this._cloudflareClient = new Cloudflare({
        apiToken: this.getApiToken(),
        baseURL: optionalCORSBaseURL(this.remoteAuth.data.corsProxy, "https://api.cloudflare.com/client/v4"),
      }))
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
    return { status: "success" };
  }

  constructor(private remoteAuth: CloudflareAPIRemoteAuthDAO) {}

  private static async exhaustPages<T = unknown>(res: V4PagePaginationArray<T>, signal?: AbortSignal) {
    const totalPages: number = (res.result_info as any).total_pages;
    const items = [];
    for await (const page of res.iterPages()) {
      items.push(...page.result);
      if (page.result_info.page ?? Infinity >= totalPages) break;
      if (signal?.aborted) break;
    }
    return items;
  }
  fetchAllAccounts = async ({ signal }: { signal?: AbortSignal } = {}) => {
    const response = await this.cf.accounts.list({ signal });
    return await RemoteAuthCloudflareAPIAgent.exhaustPages(response, signal).catch(
      RemoteAuthCloudflareAPIAgent.handleError
    );
  };

  fetchAllProjects = async ({ signal }: { signal?: AbortSignal } = {}) => {
    try {
      const projects: { name: string; id: string; subdomain: "string" }[] = [];
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
        //@ts-ignore
        projects.push(...page.result);
        if (signal?.aborted) break;
        if (!page.hasNextPage()) break;
      }
      return projects;
    } catch (error) {
      RemoteAuthCloudflareAPIAgent.handleError(error);
    }
  };
  createProject({ name }: { name: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.cf.pages.projects
      .create(
        {
          account_id: this.getAccountId()!,
          name,
          production_branch: "main",
        },
        { signal }
      )
      .catch(RemoteAuthCloudflareAPIAgent.handleError);
  }
  private static handleError(error: any): never {
    if (error instanceof APIError) {
      const message = error.errors.map((e) => e.message).join(", ");
      throw mapToTypedError(null, { message, code: String(error.status) });
    }
    throw error;
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
