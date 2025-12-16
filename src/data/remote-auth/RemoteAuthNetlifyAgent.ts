import { NetlifyClient, NetlifySite } from "@/api/netlify/NetlifyClient";
import { RemoteAuthAgentDeployableFiles } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { DeployBundle } from "@/services/deploy/DeployBundle";
import { RemoteAuthAgentSearchType } from "../useFuzzySearchQuery";

export abstract class RemoteAuthNetlifyAgent
  implements RemoteAuthAgent, RemoteAuthAgentSearchType<NetlifySite>, RemoteAuthAgentDeployableFiles<DeployBundle>
{
  private _netlifyClient!: NetlifyClient;

  get netlifyClient() {
    return this._netlifyClient || (this._netlifyClient = new NetlifyClient(this.getApiToken()));
  }

  fetchAll(options?: { signal?: AbortSignal }): Promise<NetlifySite[]> {
    return this.netlifyClient.getSites();
  }
  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    // Netlify API does not support ETag for sites, so we always return updated=true
    return Promise.resolve({ updated: true, newEtag: null });
  }

  async getRemoteUsername(): Promise<string> {
    const user = await this.netlifyClient.getCurrentUser();
    return user.full_name || user.email;
  }

  createSite = (siteName: string, { signal }: { signal?: AbortSignal } = {}) => {
    const finalSiteName = siteName.trim();
    return this.netlifyClient.createSite({ name: finalSiteName }, { signal });
  };

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      await this.netlifyClient.getCurrentUser();
      return { status: "success" };
    } catch (error: any) {
      return {
        status: "error",
        msg: `Netlify API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  async deployFiles(bundle: DeployBundle, destination: any, logStatus?: (status: string) => void): Promise<unknown> {
    logStatus?.("Starting deployment to Netlify...");
    return await this.netlifyClient.deployFiles(bundle, destination, logStatus);
  }

  async getDestinationURL(destination: any) {
    return `https://${destination.meta.subdomain || destination.meta.siteName}.netlify.app`;
  }

  abstract getUsername(): string;
  abstract getApiToken(): string;
}
