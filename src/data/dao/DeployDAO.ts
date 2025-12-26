import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployRecord } from "@/data/dao/DeployRecord";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { DestinationType } from "@/data/DestinationSchemaMap";
import { ClientDb } from "@/data/instance";
import { NotFoundError } from "@/lib/errors/errors";
import { LogLine } from "@/types/RunnerTypes";
import { nanoid } from "nanoid";

type DeployJType = ReturnType<typeof DeployDAO.prototype.toJSON>;

export class DeployDAO<T = any> implements DeployRecord<T> {
  guid: string;
  label: string;
  buildId: string;
  timestamp: number;
  workspaceId: string;
  url: string | null = null;
  deploymentUrl?: string | null = null;
  provider: DestinationType = "custom";
  destinationId: string;
  status: "idle" | "pending" | "success" | "error";
  logs: LogLine[] = [];
  meta: T;
  completedAt: number | null;
  error: string | null = null;

  static guid = () => "__deploy__" + nanoid();

  constructor({
    guid,
    label,
    timestamp,
    workspaceId,
    destinationId,
    buildId,
    status = "idle",
    logs,
    meta,
    completedAt = null,
    error = null,
    provider: destinationType = "custom",
    url = null,
    deploymentUrl = null,
  }: Optional<DeployRecord, "status" | "completedAt" | "error" | "logs" | "url"> & { deploymentUrl?: string | null }) {
    this.guid = guid;
    this.label = label;
    this.timestamp = timestamp;
    this.buildId = buildId;
    this.workspaceId = workspaceId;
    this.provider = destinationType;
    // this.destinationName = destinationName;
    this.destinationId = destinationId;
    this.status = status;
    this.logs = logs || [];
    this.meta = meta;
    this.completedAt = completedAt;
    this.error = error;
    this.url = url;
    this.deploymentUrl = deploymentUrl;
  }

  static FromJSON<T = any>(json: DeployJType | DeployRecord<any>) {
    return new DeployDAO<T>({
      ...json,
      deploymentUrl: json.deploymentUrl ?? null,
      url: json.url ?? null,
      logs: json.logs ?? [],
      completedAt: json.completedAt ?? null,
      error: json.error ?? null,
    });
  }

  toJSON() {
    return {
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      buildId: this.buildId,
      workspaceId: this.workspaceId,
      provider: this.provider,
      destinationId: this.destinationId,
      status: this.status,
      meta: this.meta,
      logs: this.logs,
      completedAt: this.completedAt,
      error: this.error,
      url: this.url,
      deploymentUrl: this.deploymentUrl,
    };
  }

  static CreateNew<T = any>({
    label,
    workspaceId,
    provider: destinationType,
    destinationId,
    meta,
    buildId,
    guid = DeployDAO.guid(),
  }: {
    label: string;
    workspaceId: string;
    buildId: string;
    meta: T;
    provider: DestinationType;
    destinationId: string;
    guid?: string;
  }) {
    return new DeployDAO<T>({
      guid,
      label,
      meta,
      timestamp: Date.now(),
      buildId,
      provider: destinationType,
      workspaceId,
      destinationId,
      completedAt: null,
      error: null,
      url: null,
      deploymentUrl: null,
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
    return (await ClientDb.deployments.orderBy("timestamp").toArray()).reverse().map(DeployDAO.FromJSON);
  }

  static async allForWorkspace(workspaceId: string) {
    const deployments = await ClientDb.deployments
      .where("workspaceId")
      .equals(workspaceId)
      .reverse()
      .sortBy("timestamp");
    return deployments.map(DeployDAO.FromJSON);
  }

  static async allForBuild(buildId: string) {
    const deployments = await ClientDb.deployments.where("buildId").equals(buildId).sortBy("timestamp");
    return deployments.reverse().map(DeployDAO.FromJSON);
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
    Object.assign(this, properties);
    await this.save();
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
      provider: this.provider,
      status: this.status,
      meta: this.meta,
      logs: this.logs,
      completedAt: this.completedAt,
      error: this.error,
      url: this.url,
      deploymentUrl: this.deploymentUrl,
    });
  }

  get effectiveUrl(): string | null {
    return this.deploymentUrl || this.url;
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
      provider: "custom",
      destinationId: "",
      meta: {},
      logs: [],
      url: null,
      deploymentUrl: null,
    });
  }
}

export class DeployModel extends DeployDAO {
  Build!: BuildDAO;
  Destination!: DestinationDAO;

  get finalUrl(): string | null {
    return this.deploymentUrl || this.Destination?.destinationUrl || this.url;
  }
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
