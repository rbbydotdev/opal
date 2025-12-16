import { CreateSiteData, NetlifyDeploy, NetlifySite, NetlifyUser } from "@/api/netlify/NetlifyTypes";
import { mapToTypedError } from "@/lib/errors/errors";
import { DeployBundle } from "@/services/deploy/DeployBundle";

export class NetlifyClient {
  private accessToken: string;
  private baseUrl = "https://api.netlify.com/api/v1";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Netlify API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (e) {
      throw mapToTypedError(e);
    }
  }

  async getCurrentUser(): Promise<NetlifyUser> {
    return this.request<NetlifyUser>("/user");
  }

  async getSites(): Promise<NetlifySite[]> {
    return this.request<NetlifySite[]>("/sites");
  }

  async getSite(siteId: string): Promise<NetlifySite> {
    return this.request<NetlifySite>(`/sites/${siteId}`);
  }

  async getDeploys(siteId: string): Promise<NetlifyDeploy[]> {
    return this.request<NetlifyDeploy[]>(`/sites/${siteId}/deploys`);
  }

  async createSite(data: CreateSiteData, { signal }: { signal?: AbortSignal } = {}): Promise<NetlifySite> {
    return this.request<NetlifySite>("/sites", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    });
  }

  async updateSite(siteId: string, data: Partial<CreateSiteData>): Promise<NetlifySite> {
    return this.request<NetlifySite>(`/sites/${siteId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSite(siteId: string): Promise<void> {
    await this.request<void>(`/sites/${siteId}`, {
      method: "DELETE",
    });
  }

  async deployFiles(
    bundle: DeployBundle,
    destination: any,
    logStatus?: (status: string) => void
  ): Promise<NetlifyDeploy> {
    const siteId = destination.meta.siteId;
    logStatus?.("Getting files from bundle...");

    const formData = new FormData();
    const files = await bundle.getFiles();

    logStatus?.(`Processing ${files.length} files for upload...`);

    // Process files and add to form data
    await Promise.all(
      files.map(async (file) => {
        formData.append(file.path, await file.asBlob(), file.path);
      })
    );

    logStatus?.("Uploading files to Netlify...");

    const response = await fetch(`${this.baseUrl}/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Deploy failed: ${response.status} ${response.statusText}`);
    }

    logStatus?.("Deploy completed successfully!");
    return response.json() as Promise<NetlifyDeploy>;
  }
}
