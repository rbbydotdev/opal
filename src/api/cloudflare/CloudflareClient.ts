import { mapToTypedError } from "@/lib/errors/errors";
import Cloudflare, { APIError } from "cloudflare";
import { V4PagePaginationArray } from "cloudflare/pagination.mjs";

export interface CloudflareAccount {
  id: string;
  name: string;
  type?: string;
}

export interface CloudflareProject {
  id: string;
  name: string;
  subdomain: string;
  created_on?: string;
  production_branch?: string;
}

export class CloudflareClient {
  private cloudflare: Cloudflare;

  constructor(apiToken: string, baseURL?: string) {
    this.cloudflare = new Cloudflare({
      apiToken,
      baseURL,
    });
  }

  private static handleError(error: any): never {
    if (error instanceof APIError) {
      const message = error.errors.map((e) => e.message).join(", ");
      throw mapToTypedError(null, { message, code: String(error.status) });
    }
    throw mapToTypedError(error);
  }

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

  async getAccounts({ signal }: { signal?: AbortSignal } = {}): Promise<CloudflareAccount[]> {
    try {
      const response = await this.cloudflare.accounts.list({ signal });
      return await CloudflareClient.exhaustPages(response, signal);
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }

  async getProjects(accountId: string, { signal }: { signal?: AbortSignal } = {}): Promise<CloudflareProject[]> {
    try {
      const projects: CloudflareProject[] = [];
      if (!accountId) {
        return [];
      }

      const res = await this.cloudflare.pages.projects.list({ account_id: accountId }, { signal });

      for await (const page of res.iterPages()) {
        //@ts-ignore
        projects.push(...page.result);
        if (signal?.aborted) break;
        if (!page.hasNextPage()) break;
      }
      return projects;
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }

  async createProject(
    accountId: string,
    { name, productionBranch = "main" }: { name: string; productionBranch?: string },
    { signal }: { signal?: AbortSignal } = {}
  ) {
    try {
      return this.cloudflare.pages.projects.create(
        {
          account_id: accountId,
          name,
          production_branch: productionBranch,
        },
        { signal }
      );
    } catch (error) {
      throw CloudflareClient.handleError(error);
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch (error) {
      logger.error("Error verifying Cloudflare credentials:", error);
      return false;
    }
  }
}
