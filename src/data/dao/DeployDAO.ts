import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployLogLine, DeployRecord } from "@/data/dao/DeployRecord";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { ClientDb } from "@/data/instance";
import { NotFoundError } from "@/lib/errors/errors";
import { nanoid } from "nanoid";

type DeployJType = ReturnType<typeof DeployDAO.prototype.toJSON>;

export class DeployDAO<T = any> implements DeployRecord<T> {
  guid: string;
  label: string;
  buildId: string;
  timestamp: number;
  workspaceId: string;
  url: string | null = null;
  destinationId: string;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  logs: DeployLogLine[] = [];
  meta: T;
  completedAt: number | null;
  error: string | null = null;

  static guid = () => "__deploy__" + nanoid();

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
    meta,
    completedAt = null,
    error = null,
    url = null,
  }: Optional<DeployRecord, "status" | "completedAt" | "error" | "logs" | "url">) {
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
    this.meta = meta;
    this.completedAt = completedAt;
    this.error = error;
    this.url = url;
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
      status: this.status,
      meta: this.meta,
      logs: this.logs,
      completedAt: this.completedAt,
      error: this.error,
      url: this.url,
    };
  }

  static CreateNew<T = any>({
    label,
    workspaceId,
    destinationId,
    meta,
    buildId,
    guid = DeployDAO.guid(),
  }: {
    label: string;
    workspaceId: string;
    buildId: string;
    meta: T;
    destinationId: string;
    guid?: string;
  }) {
    return new DeployDAO<T>({
      guid,
      label,
      meta,
      timestamp: Date.now(),
      buildId,
      workspaceId,
      destinationId,
      completedAt: null,
      error: null,
      url: null,
      logs: [],
    });
  }

  static async FetchDAOFromGuid(guid: string, throwNotFound: false): Promise<DeployDAO | null>;
  static async FetchDAOFromGuid(guid: string, throwNotFound: true): Promise<DeployDAO>;
  static async FetchDAOFromGuid(guid: string, throwNotFound = false) {
    const deploy = await ClientDb.deployments.where("guid").equals(guid).first();
    if (throwNotFound && !deploy) {
      throw new NotFoundError("Deploy not found");
    }
    return deploy ? DeployDAO.FromJSON(deploy) : null;
  }

  static async FetchModelFromGuid(guid: string): Promise<DeployModel> {
    const deploy = await DeployDAO.FetchDAOFromGuid(guid, false);
    if (!deploy) throw new NotFoundError("Deploy not found");
    return DeployModel.FromDeployDAO(deploy);
  }

  static async FetchModelFromGuidSafe(guid: string): Promise<DeployModel> {
    const deploy = await DeployDAO.FetchDAOFromGuid(guid, false);
    if (!deploy) throw new NotFoundError("Deploy not found");
    return DeployModel.FromDeployDAOSafe(deploy);
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

    // console.log(this.toJSON());
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
      status: this.status,
      meta: this.meta,
      logs: this.logs,
      completedAt: this.completedAt,
      error: this.error,
      url: this.url,
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

export class NullDeployDAO extends DeployDAO {
  constructor() {
    super({
      guid: "_null_deploy_",
      label: "NullDeploy",
      timestamp: Date.now(),
      buildId: "",
      workspaceId: "",
      destinationId: "",
      meta: {},
      logs: [],
    });
  }
}

export class DeployModel extends DeployDAO {
  Build!: BuildDAO;
  Destination!: DestinationDAO;
  private constructor(...args: ConstructorParameters<typeof DeployDAO>) {
    super(...args);
  }
  static async FromDeployDAO(deploy: DeployDAO) {
    const model = new DeployModel({ ...deploy });
    await model.hydrateMembers();
    return model;
  }

  static async FromDeployDAOSafe(deploy: DeployDAO) {
    const model = new DeployModel({ ...deploy });
    await model.hydrateMembersSafe();
    return model;
  }

  private async hydrateMembers() {
    this.Build = await BuildDAO.FetchDAOFromGuid(this.buildId, true);
    this.Destination = await DestinationDAO.FetchDAOFromGuid(this.destinationId, true);
    return this;
  }

  private async hydrateMembersSafe() {
    const build = await BuildDAO.FetchDAOFromGuid(this.buildId, false);
    this.Build = build || BuildDAO.FetchDAOFromGuidSafe(this.buildId);

    const destination = await DestinationDAO.FetchDAOFromGuid(this.destinationId, false);
    this.Destination = destination || DestinationDAO.FetchDAOFromGuidSafe(this.destinationId);

    return this;
  }
}

export const NULL_DEPLOY = new NullDeployDAO();
