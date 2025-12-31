import { WorkspaceRecord } from "@/data/dao/WorkspaceRecord";
import { ClientDb } from "@/data/db/DBInstance";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskJType, DiskType } from "@/data/disk/DiskType";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { WorkspaceStatusCode, WS_OK } from "@/data/WorkspaceStatusCode";
import { BadRequestError, errF, NotFoundError } from "@/lib/errors/errors";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { AbsPath, isAncestor } from "@/lib/paths2";
import { safeSerializer } from "@/lib/safeSerializer";
import { slugifier } from "@/lib/slugifier";
import { WorkspaceImportManifestType } from "@/services/import/manifest";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { BuildStrategy } from "@/data/dao/BuildRecord";
import { nanoid } from "nanoid";

export class WorkspaceDAO {
  static guid = () => "__workspace__" + nanoid();

  guid: string;
  name: string;
  disk: DiskDAO;
  code: WorkspaceStatusCode;
  thumbs: DiskDAO;
  remoteAuths: RemoteAuthDAO[] = [];
  timestamp: number;
  manifest: WorkspaceImportManifestType | null = null;
  buildStrategy: BuildStrategy;

  toJSON() {
    return safeSerializer({
      name: this.name,
      guid: this.guid,
      code: this.code,
      remoteAuth: this.remoteAuths,
      disk: this.disk,
      thumbs: this.thumbs,
      timestamp: this.timestamp,
      buildStrategy: this.buildStrategy,
    });
  }

  //totally weird ot have this here since its a DB access obj no ?
  static rootRoute = "/workspace" as AbsPath;
  static previewRoute = "/preview" as AbsPath;
  static editViewRoute = "/editview" as AbsPath;

  static Routes = [WorkspaceDAO.rootRoute, WorkspaceDAO.previewRoute, WorkspaceDAO.editViewRoute];

  static FromJSON(json: WorkspaceRecord) {
    return new WorkspaceDAO({
      name: json.name,
      guid: json.guid,
      disk: json.disk,
      timestamp: json.timestamp,
      thumbs: json.thumbs,
      remoteAuths: json.remoteAuths,
      code: json.code,
      manifest: json.manifest,
      buildStrategy: json.buildStrategy || "freeform",
    });
  }

  get href() {
    return `${WorkspaceDAO.rootRoute}/${this.name}`;
  }

  static async allRecords() {
    return ClientDb.workspaces.toArray();
  }
  static async all() {
    return (await ClientDb.workspaces.orderBy("timestamp").reverse().toArray()).map((ws) => new WorkspaceDAO(ws));
  }
  static async nameExists(name: string) {
    const result = await WorkspaceDAO.FetchFromName(name, {
      throwNotFound: false,
    });
    return result !== null;
  }

  isOk = () => {
    return this.code === WS_OK;
  };
  async recoverStatus() {
    if (this.code !== WS_OK) {
      console.log(`Recovering workspace status for ${this.name} from code ${this.code} to OK`);
      await this.setStatusCode(WS_OK);
    }
  }
  async setStatusCode(code: WorkspaceStatusCode) {
    this.code = code;
    await this.save();
  }

  save = async () => {
    return ClientDb.workspaces.put({
      guid: this.guid,
      name: this.name,
      disk: this.disk.toJSON(),
      remoteAuths: this.remoteAuths.map((ra) => ra.toJSON()),
      thumbs: this.thumbs,
      code: this.code,
      timestamp: this.timestamp || Date.now(),
      manifest: this.manifest,
      buildStrategy: this.buildStrategy,
    });
  };
  static async CreateNewWithDiskType(
    {
      name,
      diskType,
      remoteAuths = [],
      buildStrategy = "freeform",
    }: {
      name: string;
      diskType?: DiskType;
      remoteAuths?: RemoteAuthDAO[];
      buildStrategy?: BuildStrategy;
    },
    properties?: Pick<WorkspaceRecord, "manifest">
  ) {
    const disk = DiskDAO.CreateNew(diskType);
    const thumbs = DiskDAO.CreateNew(diskType);
    return WorkspaceDAO.CreateNew({
      ...properties,
      name,
      remoteAuths,
      thumbs,
      disk,
      buildStrategy,
    });
  }

  // static async FindImport()

  static async CreateNew({
    name,
    remoteAuths = [],
    thumbs = DiskDAO.CreateNew(),
    disk = DiskDAO.CreateNew(),
    manifest = null,
    buildStrategy = "freeform",
  }: {
    name: string;
    remoteAuths?: RemoteAuthDAO[];
    thumbs?: DiskDAO;
    disk?: DiskDAO;
    manifest?: WorkspaceImportManifestType | null;
    buildStrategy?: BuildStrategy;
  }) {
    const slugName = WorkspaceDAO.Slugify(name).toLowerCase();
    let uniqueName = slugName;
    let inc = 0;
    while (await WorkspaceDAO.nameExists(uniqueName)) {
      uniqueName = `${slugName}-${++inc}`;
    }
    const workspace = new WorkspaceDAO({
      name: uniqueName,
      guid: WorkspaceDAO.guid(),
      disk,
      thumbs,
      remoteAuths,
      code: WS_OK,
      timestamp: Date.now(),
      manifest,
      buildStrategy,
    });
    await ClientDb.transaction("rw", ClientDb.disks, ClientDb.remoteAuths, ClientDb.workspaces, async () => {
      return await Promise.all([
        disk.save(),
        thumbs.save(),
        Promise.all(remoteAuths.map((ra) => ra.save())),
        workspace.save(),
      ]);
    });

    return new WorkspaceDAO({ ...workspace, remoteAuths, disk, thumbs });
  }
  static async FetchByNameOrId(name: string) {
    const ws = await ClientDb.workspaces.where("name").equals(name).or("guid").equals(name).first();
    if (!ws) throw new NotFoundError("Workspace not found: " + name);
    return new WorkspaceDAO(ws);
  }
  static async FetchByGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError("Workspace not found: " + guid);
    return new WorkspaceDAO(ws);
  }

  static Slugify(name: string) {
    return slugifier(name);
  }

  static async fetchFromRoute(route: string) {
    if (!isAncestor({ child: route, parent: WorkspaceDAO.rootRoute }))
      throw new BadRequestError("Invalid route " + route);

    const name = route.slice(WorkspaceDAO.rootRoute.length + 1).split("/")[0];

    if (!name) {
      throw new Error("could not parse workspace route, invalid route");
    }

    const ws =
      (await ClientDb.workspaces.where("name").equals(name).first()) ??
      (await ClientDb.workspaces.where("guid").equals(name).first());
    if (!ws) throw new NotFoundError(errF`Workspace not found name:${name}, guid:${name}`);
    return ws;
  }
  static async FetchFromGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError(errF`Workspace not found guid:${guid}`);
    return WorkspaceDAO.FromJSON(ws);
  }
  static async FetchFromName(name: string): Promise<WorkspaceDAO>;
  static async FetchFromName(name: string, options: { throwNotFound: boolean }): Promise<WorkspaceDAO | null>;
  static async FetchFromName(
    name: string,
    options: { throwNotFound: boolean } = { throwNotFound: true }
  ): Promise<WorkspaceDAO | null> {
    const ws = await ClientDb.workspaces.where("name").equals(name).first();
    if (!ws) {
      if (!options.throwNotFound) return null;
      throw new NotFoundError(errF`Workspace not found name:${name}`);
    }
    return WorkspaceDAO.FromJSON(ws);
  }

  static async FindAlikeImport({
    provider,
    ident,
    type,
  }: {
    provider?: string;
    ident?: string;
    type?: "template" | "showcase";
  }): Promise<WorkspaceDAO | undefined> {
    const workspaces = await WorkspaceDAO.all();
    return workspaces.find(
      (ws) =>
        (provider === undefined || ws.manifest?.provider === provider) &&
        (ident === undefined || ws.manifest?.ident === ident) &&
        (type === undefined || ws.manifest?.type === type)
    );
  }

  rename(name: string) {
    return ClientDb.transaction("rw", "workspaces", async () => {
      const all = await WorkspaceDAO.all();
      const newName = getUniqueSlug(
        name,
        all.map((ws) => ws.name)
      );
      this.name = newName;
      await this.save();
      return newName;
    });
  }

  delete() {
    return ClientDb.workspaces.delete(this.guid);
  }

  // Moved FetchModelFromNameAndInit and FetchModelFromName to Workspace class to avoid circular dependency

  static async FetchFromRouteAndInit(route: string) {
    return await WorkspaceDAO.fetchFromRoute(route);
  }

  constructor({
    guid,
    name,
    disk,
    thumbs,
    remoteAuths = [],
    code,
    timestamp,
    manifest = null,
    buildStrategy = "freeform",
  }: {
    guid: string;
    name: string;
    disk: DiskDAO | DiskJType;
    thumbs: DiskDAO | DiskJType;
    remoteAuths: RemoteAuthJType[];
    code: WorkspaceStatusCode;
    timestamp: number;
    manifest?: WorkspaceImportManifestType | null;
    buildStrategy?: BuildStrategy;
  }) {
    this.guid = guid;
    this.name = name;
    this.code = code;
    this.disk = DiskDAO.FromJSON(disk);
    this.thumbs = DiskDAO.FromJSON(thumbs);
    this.remoteAuths = remoteAuths.map((ra) => RemoteAuthDAO.FromJSON(ra));
    this.timestamp = timestamp;
    this.manifest = manifest;
    this.buildStrategy = buildStrategy;
  }
}
