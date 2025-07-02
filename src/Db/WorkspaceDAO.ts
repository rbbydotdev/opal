import { DiskJType, IndexedDbDisk } from "@/Db/Disk";
import { ClientDb } from "@/Db/instance";
import { RemoteAuthDAO, RemoteAuthJType } from "@/Db/RemoteAuth";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceRecord } from "@/Db/WorkspaceRecord";
import { BadRequestError, errF, NotFoundError } from "@/lib/errors";
import { AbsPath, isAncestor } from "@/lib/paths2";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { DiskDAO } from "./DiskDAO";

export type WorkspaceGuid = Brand<string, "WorkspaceGuid">;

export const isWorkspaceGuid = (workspaceGuid: string): workspaceGuid is WorkspaceGuid =>
  workspaceGuid.startsWith("__workspace__");

export const wrkId = (id: string) => {
  if (isWorkspaceGuid(id)) return id as WorkspaceGuid;
  throw new Error("unknown id expected, /^__workspace__.+/");
};

export class WorkspaceDAO {
  static guid = () => "__workspace__" + nanoid();

  guid: string;
  name: string;
  disk: DiskDAO;
  thumbs: DiskDAO;
  remoteAuth: RemoteAuthDAO;

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      remoteAuth: this.remoteAuth,
      disk: this.disk,
      thumbs: this.thumbs,
    };
  }

  //totally weird ot have this here since its a DB access obj no ?
  static rootRoute = "/workspace" as AbsPath;

  static FromJSON(json: WorkspaceRecord) {
    return new WorkspaceDAO({
      name: json.name,
      guid: json.guid,
      disk: json.disk,
      thumbs: json.thumbs,
      remoteAuth: json.remoteAuth,
    });
  }

  get href() {
    return `${WorkspaceDAO.rootRoute}/${this.name}`;
  }

  static async allRecords() {
    return ClientDb.workspaces.toArray();
  }
  static async all() {
    const workspaceRecords = await ClientDb.workspaces.toArray();
    return workspaceRecords.map((ws) => new WorkspaceDAO(ws));
  }
  static async nameExists(name: string) {
    const result = await WorkspaceDAO.FetchFromName(name, {
      throwNotFound: false,
    });
    return result !== null;
  }

  save = async () => {
    return ClientDb.workspaces.put({
      guid: this.guid,
      name: this.name,
      disk: this.disk,
      remoteAuth: this.remoteAuth,
      thumbs: this.thumbs,
    });
  };
  static async CreateNew(
    name: string,
    remoteAuth: RemoteAuthDAO = RemoteAuthDAO.new(),
    disk: DiskDAO = DiskDAO.CreateNew(IndexedDbDisk.type),
    thumbs: DiskDAO = DiskDAO.CreateNew(IndexedDbDisk.type)

    // disk: DiskDAO = DiskDAO.CreateNew(MemDisk.type),
    // thumbs: DiskDAO = DiskDAO.CreateNew(MemDisk.type)
  ) {
    let uniqueName = WorkspaceDAO.Slugify(name);
    let inc = 0;
    while (await WorkspaceDAO.nameExists(uniqueName)) {
      uniqueName = `${name}-${++inc}`;
    }
    const workspace = new WorkspaceDAO({
      name: uniqueName,
      guid: WorkspaceDAO.guid(),
      disk,
      thumbs,
      remoteAuth,
    });
    await ClientDb.transaction("rw", ClientDb.disks, ClientDb.remoteAuths, ClientDb.workspaces, async () => {
      return await Promise.all([disk.save(), thumbs.save(), remoteAuth.save(), workspace.save()]);
    });

    return new WorkspaceDAO({ ...workspace, remoteAuth, disk, thumbs });
  }
  static async FetchByName(name: string) {
    const ws = await ClientDb.workspaces.where("name").equals(name).first();
    if (!ws) throw new NotFoundError("Workspace not found: " + name);
    return new WorkspaceDAO(ws);
  }
  static async FetchByGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError("Workspace not found: " + guid);
    return new WorkspaceDAO(ws);
  }

  static Slugify(name: string) {
    return slugify(name, { strict: true });
  }
  private getRemoteAuth() {
    return RemoteAuthDAO.FromJSON(this.remoteAuth);
  }

  getDisk() {
    return DiskDAO.FromJSON(this.disk);
  }

  getThumbs() {
    return DiskDAO.FromJSON(this.thumbs);
  }

  static async fetchFromRoute(route: string) {
    if (!isAncestor(route, WorkspaceDAO.rootRoute)) throw new BadRequestError("Invalid route " + route);

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

  static async ToModelFromGuid(guid: string) {
    const workspaceDAO = await WorkspaceDAO.FetchFromGuid(guid);
    return workspaceDAO.toModel();
  }
  toModel() {
    return new Workspace(
      {
        ...this,
        disk: this.disk.toModel(),
        thumbs: this.thumbs.toModel(),
        remoteAuth: this.remoteAuth.toModel(),
      },
      this
    );
  }

  delete() {
    return ClientDb.workspaces.delete(this.guid);
  }

  static async FetchModelFromNameAndInit(name: string) {
    const workspaceDAO = await WorkspaceDAO.FetchFromName(name);
    return workspaceDAO.toModel().init();
  }
  static async FetchModelFromName(name: string) {
    return (await WorkspaceDAO.FetchFromName(name)).toModel();
  }

  static async FetchFromRouteAndInit(route: string) {
    return await WorkspaceDAO.fetchFromRoute(route);
  }

  constructor({
    guid,
    name,
    disk,
    thumbs,
    remoteAuth,
  }: {
    guid: string;
    name: string;
    disk: DiskDAO | DiskJType;
    thumbs: DiskDAO | DiskJType;
    remoteAuth: RemoteAuthDAO | RemoteAuthJType;
  }) {
    this.guid = guid;
    this.name = name;
    this.disk = DiskDAO.FromJSON(disk);
    this.thumbs = DiskDAO.FromJSON(thumbs);
    this.remoteAuth = RemoteAuthDAO.FromJSON(remoteAuth);
  }
}
