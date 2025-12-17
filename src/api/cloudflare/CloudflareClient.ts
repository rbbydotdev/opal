import { mapToTypedError } from "@/lib/errors/errors";
import { getMimeType } from "@/lib/mimeType";
import { UniversalDeployFile } from "@/services/deploy/DeployBundle";
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
    console.log(error.name, error);
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
  async getAccountByName(
    accountName: string,
    { signal }: { signal?: AbortSignal } = {}
  ): Promise<CloudflareAccount | null> {
    try {
      const accounts = await this.getAccounts({ signal });
      return accounts.find((acc) => acc.name === accountName) || null;
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

  async deployToPages(
    accountId: string,
    projectName: string,
    files: UniversalDeployFile[],
    options: { logStatus?: (status: string) => void } = {}
  ): Promise<any> {
    const { logStatus } = options;

    try {
      logStatus?.("Creating deployment...");

      // Convert files to the format expected by Cloudflare Pages API
      const formData = new FormData();

      // Add manifest
      const manifest = Object.keys(files).reduce(
        (acc, path) => {
          acc[path] = {
            hash: path, // Simple hash for now
            contentType: getMimeType(path),
          };
          return acc;
        },
        {} as Record<string, any>
      );

      formData.append("manifest", JSON.stringify(manifest));

      // Add files
      files.forEach(async (file) => {
        formData.append(file.path, await file.asBlob(getMimeType(file.path)), file.path);
      });

      logStatus?.("Uploading to Cloudflare Pages...");

      // Use the Cloudflare Pages API to create a deployment
      const deployment = await this.cloudflare.pages.projects.deployments.create(
        projectName,
        {
          account_id: accountId,
        },
        {
          body: formData,
        }
      );

      logStatus?.("Deployment created successfully");
      return deployment;
    } catch (error) {
      logStatus?.(`Deployment failed: ${error}`);
      throw CloudflareClient.handleError(error);
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch (error) {
      console.error("Error verifying Cloudflare credentials:", error);
      return false;
    }
  }
}
