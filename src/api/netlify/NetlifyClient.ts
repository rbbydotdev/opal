import { CreateSiteData, NetlifyDeploy, NetlifySite, NetlifyUser } from "@/api/netlify/NetlifyTypes";
import { NetlifyDestination } from "@/data/DestinationSchemaMap";
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

  async getSiteIdByName(siteName: string): Promise<string | null> {
    const sites = await this.getSites();
    const site = sites.find((s) => s.name === siteName);
    return site?.id || null;
  }

  async deployFiles(
    bundle: DeployBundle,
    destination: NetlifyDestination,
    logStatus?: (status: string) => void
  ): Promise<NetlifyDeploy> {
    let siteId: string | null = destination.meta.siteId || null;

    // If no siteId but we have siteName, resolve it
    if (!siteId && destination.meta.siteName) {
      logStatus?.("Resolving site ID from site name...");
      siteId = await this.getSiteIdByName(destination.meta.siteName);
      if (!siteId) {
        throw new Error(`Site with name "${destination.meta.siteName}" not found`);
      }
    }

    if (!siteId) {
      throw new Error("Neither siteId nor siteName provided in destination");
    }

    logStatus?.("Getting files from bundle...");

    const files = await bundle.getFiles();

    logStatus?.(`Processing ${files.length} files for upload...`);

    // Step 1: Create file digest with SHA1 hashes
    const filesDigest: Record<string, string> = {};
    const fileMap = new Map<string, (typeof files)[0]>();

    await Promise.all(
      files.map(async (file) => {
        const sha1 = await file.getSHA1();
        filesDigest[file.path] = sha1;
        fileMap.set(sha1, file);
      })
    );

    logStatus?.("Creating empty deploy...");

    // Step 1: Create empty deploy
    const emptyDeploy = await this.request<NetlifyDeploy>(`/sites/${siteId}/deploys`, {
      method: "POST",
      body: JSON.stringify({ draft: false }),
    });

    logStatus?.("Updating deploy with file digest...");

    // Step 2: Update deploy with file hashes
    const deploy = await this.request<NetlifyDeploy & { required?: string[] }>(
      `/sites/${siteId}/deploys/${emptyDeploy.id}`,
      {
        method: "PUT",
        body: JSON.stringify({ files: filesDigest }),
      }
    );

    logStatus?.(`Deploy updated. Uploading ${deploy.required?.length || 0} required files...`);

    // Step 3: Upload required files
    if (deploy.required && deploy.required.length > 0) {
      await Promise.all(
        deploy.required.map(async (sha1) => {
          const file = fileMap.get(sha1);
          if (file) {
            logStatus?.(`Uploading ${file.path}...`);
            const fileContent = await file.asUint8Array();

            await fetch(`${this.baseUrl}/deploys/${deploy.id}/files/${file.path}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/octet-stream",
              },
              body: fileContent as BodyInit,
            });
          }
        })
      );
    }

    logStatus?.("Deploy completed successfully!");
    return deploy;
  }
}
