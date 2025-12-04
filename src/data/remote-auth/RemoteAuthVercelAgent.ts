import { RefreshAuth } from "@/data/RefreshAuth";
import { RemoteAuthAgent, RemoteAuthAgentCORS, RemoteAuthAgentRefreshToken } from "@/data/RemoteAuthTypes";
import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { mapToTypedError } from "@/lib/errors/errors";
import { Vercel } from "@vercel/sdk";
import { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";
import { GetProjectsProjects } from "@vercel/sdk/models/getprojectsop.js";
import { VercelError } from "@vercel/sdk/models/vercelerror.js";

export type VercelProject = GetProjectsProjects;

export abstract class RemoteAuthVercelAgent
  implements RemoteAuthAgent, RemoteAuthAgentCORS, RemoteAuthAgentRefreshToken, RemoteAuthAgentSearchType<VercelProject>
{
  private _vercelClient!: Vercel;

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
  static handleError(error: any): never {
    if (error instanceof VercelError) {
      throw (function () {
        try {
          const parsed = JSON.parse(error.body) as any;
          const message = parsed.error.message;
          const code = parsed.error.code;
          return mapToTypedError(null, { message, code });
        } catch {
          return error;
        }
      })();
    }
    throw error;
  }

  async getCurrentUser({ signal }: { signal?: AbortSignal } = {}) {
    return await this.vercelClient.user
      .getAuthUser({ signal, mode: "cors" })
      .then((res) => res.user)
      .catch(RemoteAuthVercelAgent.handleError);
  }

  async createProject(params: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercelClient.projects
      .createProject(
        {
          teamId: params.teamId,
          requestBody: {
            name: params.name,
          },
        },
        { signal, mode: "cors" }
      )
      .catch(RemoteAuthVercelAgent.handleError);
  }
  async deploy({ projectName, files }: { projectName: string; files: InlinedFile[] }) {
    const { id, url } = await this.vercelClient.deployments.createDeployment(
      {
        requestBody: {
          name: projectName,
          files,
        },
      },
      {
        mode: "cors",
      }
    );
    return { deploymentId: id, deploymentUrl: url };
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
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const deployment = await this.vercelClient.deployments.getDeployment(
            {
              idOrUrl: deploymentId,
            },
            {
              signal,
              mode: "cors",
            }
          );
          onStatus(deployment.status);
          if (deployment.status === "READY") {
            clearInterval(interval);
            resolve();
          }
          if (deployment.status === "ERROR") {
            clearInterval(interval);
            reject(new Error(deployment.errorMessage || "Deployment failed with unknown error"));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, pollInterval);

      if (signal) {
        signal.addEventListener("abort", () => {
          clearInterval(interval);
          reject(new Error("Polling aborted"));
        });
      }
    });
  }

  async getProject({ name, teamId }: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return (await this.vercelClient.projects.getProjects({ teamId, slug: name }, { signal, mode: "cors" })).projects.at(
      0
    );
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
        })
        .catch(RemoteAuthVercelAgent.handleError);
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

  // checkAuth(): Promise<boolean> | boolean {
  //   return true; // Default: assume auth is valid
  // }

  // reauth(): Promise<void> | void {
  //   // Default: no reauth needed
  // }

  abstract checkAuth(): Promise<boolean> | boolean;
  abstract reauth(): Promise<void> | void;
  abstract getCORSProxy(): string | undefined;
  abstract getUsername(): string;
  abstract getApiToken(): string;
}
