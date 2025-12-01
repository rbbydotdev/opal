import { RefreshAuth } from "@/data/RefreshAuth";
import { RemoteAuthAgentCORS } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { Vercel } from "@vercel/sdk";
import { GetProjectsProjects } from "@vercel/sdk/models/getprojectsop.js";

export abstract class RemoteAuthVercelAgent implements RemoteAuthAgentCORS, RemoteAuthAgentSearchType<VercelProject> {
  private _vercelClient!: Vercel;

  // serverURL: this.getCORSProxy() ? `${stripTrailingSlash(this.getCORSProxy()!)}/api.vercel.com` : undefined,
  get vercelClient(): Vercel {
    return (
      this._vercelClient ||
      (this._vercelClient = RefreshAuth(
        () =>
          new Vercel({
            bearerToken: this.getApiToken(),
          }),
        () => this.checkAuth(),
        () => this.reauth()
      ))
    );
  }

  async getCurrentUser({ signal }: { signal?: AbortSignal } = {}) {
    return await this.vercelClient.user.getAuthUser({ signal, mode: "cors" }).then((res) => res.user);
  }

  async createProject(params: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercelClient.projects.createProject(params, { signal, mode: "cors" });
  }

  async getProject(projectId: string, teamId?: string, { signal }: { signal?: AbortSignal } = {}) {
    return (await this.vercelClient.projects.getProjects({ teamId }, { signal, mode: "cors" })).projects.find(
      (p) => p.id === projectId
    )!;
  }

  async getAllProjects({ teamId }: { teamId?: string } = {}, { signal }: { signal?: AbortSignal } = {}) {
    let continueToken: number | null = null;
    const results: VercelProject[] = [];
    do {
      const projects = await this.vercelClient.projects
        //@ts-ignore
        .getProjects(
          { teamId, from: continueToken !== null ? continueToken : undefined, limit: "100" },
          { signal, mode: "cors" }
        )
        .then((res) => {
          continueToken = res.pagination.next as number;
          return res.projects;
        });
      results.push(...projects);
    } while (continueToken);
    return results;
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
      await this.getCurrentUser();
      return { status: "success" };
    } catch (error: any) {
      return {
        status: "error",
        msg: `Vercel API test failed: ${error.message || "Unknown error"}`,
      };
    }
  }

  checkAuth(): Promise<boolean> | boolean {
    return true; // Default: assume auth is valid
  }

  reauth(): Promise<void> | void {
    // Default: no reauth needed
  }

  abstract getCORSProxy(): string | undefined;
  abstract getUsername(): string;
  abstract getApiToken(): string;
}
export type VercelProject = GetProjectsProjects;
