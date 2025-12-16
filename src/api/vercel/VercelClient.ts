import { mapToTypedError } from "@/lib/errors/errors";
import { Vercel } from "@vercel/sdk";
import { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";
import { GetProjectsProjects } from "@vercel/sdk/models/getprojectsop.js";
import { VercelError } from "@vercel/sdk/models/vercelerror.js";

export type VercelProject = GetProjectsProjects;

export class VercelClient {
  private vercel: Vercel;

  constructor(bearerToken: string) {
    this.vercel = new Vercel({ bearerToken });
  }

  private static handleError(error: any): never {
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
    return await this.vercel.user
      .getAuthUser({ signal, mode: "cors" })
      .then((res) => res.user)
      .catch(VercelClient.handleError);
  }

  async createProject(params: { name: string; teamId?: string }, { signal }: { signal?: AbortSignal } = {}) {
    return this.vercel.projects
      .createProject(
        {
          teamId: params.teamId,
          requestBody: {
            name: params.name,
          },
        },
        { signal, mode: "cors" }
      )
      .catch(VercelClient.handleError);
  }

  async deploy({ projectName, files }: { projectName: string; files: InlinedFile[] }) {
    const { id, url } = await this.vercel.deployments.createDeployment(
      {
        requestBody: {
          name: projectName,
          files,
          projectSettings: {
            framework: null,
            buildCommand: null,
            outputDirectory: ".",
            installCommand: null,
            devCommand: null,
            rootDirectory: null,
          },
        },
      },
      {
        mode: "cors",
      }
    );
    return { deploymentId: id, deploymentUrl: url };
  }

  async getDeployment({ deploymentId, signal }: { deploymentId: string; signal?: AbortSignal }) {
    return this.vercel.deployments.getDeployment(
      {
        idOrUrl: deploymentId,
      },
      {
        signal,
        mode: "cors",
      }
    );
  }

  async pollDeploymentStatus({
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
          const deployment = await this.getDeployment({ deploymentId, signal });
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

  async getProject({ name, teamId, signal }: { name: string; teamId?: string; signal?: AbortSignal }) {
    return (await this.vercel.projects.getProjects({ teamId, slug: name }, { signal, mode: "cors" })).projects.at(0);
  }

  async getProjects({ teamId, signal }: { teamId?: string; signal?: AbortSignal } = {}) {
    let continueToken: number | null = null;
    const results: VercelProject[] = [];
    do {
      const projects = await this.vercel.projects
        //@ts-ignore
        .getProjects(
          { teamId, from: continueToken !== null ? continueToken : undefined, limit: "100" },
          { signal, mode: "cors" }
        )
        .then((res) => {
          continueToken = res.pagination.next as number;
          return res.projects;
        })
        .catch(VercelClient.handleError);
      results.push(...projects);
    } while (continueToken);
    return results;
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      logger.error("Error verifying Vercel credentials:", error);
      return false;
    }
  }
}
