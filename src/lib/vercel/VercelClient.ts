// import { Vercel } from "@vercel/sdk";
// import { GetProjectsProjects } from "@vercel/sdk/models/getprojectsop.js";

// export type VercelProject = GetProjectsProjects;
// export class VercelClient {
//   private _vercelClient: Vercel | null = null;
//   private corsProxy?: string;
//   private accessToken: string;
//   get vercelClient(): Vercel {
//     return {};
//     if (!this._vercelClient) {
//       this._vercelClient = new Vercel({
//         bearerToken: this.accessToken,
//         serverURL: this.corsProxy ? `https://${this.corsProxy}/api.vercel.com` : undefined,
//       });
//       console.log(">>>>>>", this.corsProxy ? `https://${this.corsProxy}/api.vercel.com` : undefined);
//     }
//     return this._vercelClient;
//   }

//   async getCurrentUser({ signal }: { signal?: AbortSignal } = {}) {
//     return await this.vercelClient.user.getAuthUser({ signal }).then((res) => res.user);
//   }
//   async createProject(params: { name: string; teamId?: string }) {
//     return this.vercelClient.projects.createProject(params);
//   }
//   async getAllProjects({ teamId }: { teamId?: string } = {}, { signal }: { signal?: AbortSignal } = {}) {
//     throw new Error("Not implemented");
//     console.log({ teamId });
//     //projects is paginated but for now we ignore that
//     let continueToken: number | null = null;
//     const results: GetProjectsProjects[] = [];
//     do {
//       console.log({ continueToken });
//       const projects = await this.vercelClient.projects
//         //@ts-ignore
//         .getProjects({ teamId, from: continueToken !== null ? continueToken : undefined, limit: 100 }, { signal })
//         .then((res) => {
//           continueToken = res.pagination.next as number;
//           return res.projects;
//         });
//       results.push(...projects);
//     } while (continueToken);
//     return results;
//   }
//   constructor({ accessToken, corsProxy }: { accessToken: string; corsProxy?: string }) {
//     this.accessToken = accessToken;
//     this.corsProxy = corsProxy;
//   }
// }
