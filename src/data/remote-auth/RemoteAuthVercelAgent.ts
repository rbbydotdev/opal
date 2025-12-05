import { VercelClient, VercelProject } from "@/api/vercel/VercelClient";
import { RefreshAuth } from "@/data/RefreshAuth";
import { RemoteAuthAgent, RemoteAuthAgentCORS, RemoteAuthAgentRefreshToken } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";

export type { VercelProject };

export abstract class RemoteAuthVercelAgent
  implements RemoteAuthAgent, RemoteAuthAgentCORS, RemoteAuthAgentRefreshToken, RemoteAuthAgentSearchType<VercelProject>
{
  private _vercelClient!: VercelClient;

  get vercelClient(): VercelClient {
    return (
      this._vercelClient ||
      (this._vercelClient = RefreshAuth(
        () => new VercelClient(this.getApiToken()),
        () => this.checkAuth(),
        () => this.reauth()
      ))
    );
  }

  async getCurrentUser({ signal }: { signal?: AbortSignal } = {}) {
    return await this.vercelClient.getCurrentUser({ signal });
  }

  async createProject(params: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercelClient.createProject(params, { signal });
  }
  async deploy({ projectName, files }: { projectName: string; files: InlinedFile[] }) {
    return this.vercelClient.deploy({ projectName, files });
  }

  pollProjectDeploymentStatus({
    deploymentId,
    onStatus,
    pollInterval = 2500,
    signal,
  }: {
    deploymentId: string;
    onStatus: (status: string) => void;
    pollInterval?: number;
    signal?: AbortSignal;
  }): Promise<void> {
    return this.vercelClient.pollDeploymentStatus({
      deploymentId,
      onStatus,
      pollInterval,
      signal,
    });
  }

  async getProject({ name, teamId }: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercelClient.getProject({ name, teamId, signal });
  }

  async getAllProjects({ teamId }: { teamId?: string } = {}, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercelClient.getProjects({ teamId, signal });
  }

  async fetchAll(options?: { signal?: AbortSignal }): Promise<VercelProject[]> {
    return this.getAllProjects();
  }

  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }> {
    return Promise.resolve({ updated: true, newEtag: null });
  }

  async getRemoteUsername(): Promise<string> {
    const user = await this.getCurrentUser();
    return user.name || user.username || user.email;
  }

  async test(): Promise<{ status: "error"; msg: string } | { status: "success" }> {
    try {
      const isValid = await this.vercelClient.verifyCredentials();
      if (isValid) {
        return { status: "success" };
      } else {
        return { status: "error", msg: "Invalid Vercel credentials" };
      }
    } catch (error: any) {
      return {
        status: "error",
        msg: `Vercel API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  abstract checkAuth(): Promise<boolean> | boolean;
  abstract reauth(): Promise<void> | void;
  abstract getCORSProxy(): string | undefined;
  abstract getUsername(): string;
  abstract getApiToken(): string;
}
