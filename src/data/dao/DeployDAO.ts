import { DeployLogLine, DeployRecord } from "@/data/dao/DeployRecord";
import { ClientDb } from "@/data/instance";
import { nanoid } from "nanoid";

type DeployJType = ReturnType<typeof DeployDAO.prototype.toJSON>;

export class DeployDAO<T = any> implements DeployRecord<T> {
  guid: string;
  label: string;
  buildId: string;
  timestamp: number;
  workspaceId: string;
  // destinationType: "cloudflare" | "netlify" | "github" | "vercel" | "aws";
  // destinationName: string;
  destinationId: string;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: DeployLogLine[];
  data: T;
  completedAt: number | null;
  error: string | null = null;

  static guid = () => "deploy_id_" + nanoid();

  constructor({
    guid,
    label,
    timestamp,
    workspaceId,
    // destinationType,
    // destinationName,
    destinationId,
    buildId,
    status = "idle",
    logs,
    data,
    completedAt = null,
    error = null,
  }: Optional<DeployRecord, "status" | "completedAt" | "error" | "logs">) {
    this.guid = guid;
    this.label = label;
    this.timestamp = timestamp;
    this.buildId = buildId;
    this.workspaceId = workspaceId;
    // this.destinationType = destinationType;
    // this.destinationName = destinationName;
    this.destinationId = destinationId;
    this.status = status;
    this.logs = logs || [];
    this.data = data;
    this.completedAt = completedAt;
    this.error = error;
  }

  static FromJSON<T = any>(json: DeployJType) {
    return new DeployDAO<T>(json);
  }

  toJSON() {
    return {
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      buildId: this.buildId,
      workspaceId: this.workspaceId,
      destinationId: this.destinationId,
      // destinationType: this.destinationType,
      // destinationName: this.destinationName,
      status: this.status,
      data: this.data,
      logs: this.logs,
      completedAt: this.completedAt,
      error: this.error,
    };
  }

  static CreateNew<T = any>({
    label,
    workspaceId,
    destinationId,
    data,
    buildId,
    guid = DeployDAO.guid(),
    // logs,
    // destinationType,
    // destinationName,
  }: {
    label: string;
    workspaceId: string;
    buildId: string;
    data: T;
    destinationId: string;
    // destinationType: "cloudflare" | "netlify" | "github" | "vercel" | "aws";
    // destinationName: string;
    guid?: string;
    // logs?: DeployLogLine[];
  }) {
    return new DeployDAO<T>({
      guid,
      label,
      data,
      timestamp: Date.now(),
      buildId,
      workspaceId,
      // destinationType,
      // destinationName,
      destinationId,
      completedAt: null,
      error: null,
      logs: [],
    });
  }

  static async FetchFromGuid<T = any>(guid: string) {
    const result = await ClientDb.deployments.where("guid").equals(guid).first();
    if (!result) return result;
    return DeployDAO.FromJSON<T>(result);
  }

  static async all() {
    return (await ClientDb.deployments.orderBy("timestamp").toArray()).map(DeployDAO.FromJSON);
  }

  static async allForWorkspace(workspaceId: string) {
    const deployments = await ClientDb.deployments
      .where("workspaceId")
      .equals(workspaceId)
      .reverse()
      .sortBy("timestamp");
    return deployments.map((deployment) => DeployDAO.FromJSON(deployment));
  }

  static async allForBuild(buildId: string) {
    const deployments = await ClientDb.deployments.where("buildId").equals(buildId).reverse().sortBy("timestamp");
    return deployments.map((deployment) => DeployDAO.FromJSON(deployment));
  }

  async hydrate() {
    const deployment = await DeployDAO.FetchFromGuid(this.guid);
    if (deployment) {
      Object.assign(this, deployment);
    }
    return this;
  }

  async update({ ...properties }: Partial<Omit<DeployRecord, "guid">>) {
    await ClientDb.deployments.update(this.guid, properties);
    return this.hydrate();
  }

  save() {
    return ClientDb.deployments.put({
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      buildId: this.buildId,
      workspaceId: this.workspaceId,
      destinationId: this.destinationId,
      // destinationType: this.destinationType,
      // destinationName: this.destinationName,
      status: this.status,
      data: this.data,
      logs: this.logs,
      completedAt: this.completedAt,
      error: this.error,
    });
  }

  get completed() {
    return this.status === "success" || this.status === "failed" || this.status === "cancelled";
  }

  get isSuccessful() {
    return this.status === "success";
  }

  get isFailed() {
    return this.status === "failed";
  }

  get isCancelled() {
    return this.status === "cancelled";
  }

  get isDeploying() {
    return this.status === "pending";
  }

  get isIdle() {
    return this.status === "idle";
  }

  async delete() {
    return DeployDAO.delete(this.guid);
  }

  static delete(guid: string) {
    return ClientDb.deployments.delete(guid);
  }
}

class NullDeployDAO extends DeployDAO {
  constructor() {
    super({
      guid: "_null_deploy_",
      label: "NullDeploy",
      timestamp: Date.now(),
      buildId: "",
      workspaceId: "",
      destinationId: "",
      data: {},
      logs: [],
      // destinationType: "netlify",
      // destinationName: "null",
    });
  }
}
