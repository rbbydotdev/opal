"use client";
import { DiskDAO, DiskJType, IndexedDbDisk } from "@/Db/Disk";
import { ClientDb } from "@/Db/instance";
import { RemoteAuthDAO, RemoteAuthJType } from "@/Db/RemoteAuth";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceRecord } from "@/Db/WorkspaceRecord";
import { BadRequestError, errF, NotFoundError } from "@/lib/errors";
import { isAncestor } from "@/lib/paths2";
import { nanoid } from "nanoid";
import slugify from "slugify";

export class WorkspaceDAO implements WorkspaceRecord {
  static guid = () => "__workspace__" + nanoid();

  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  createdAt!: Date;
  remoteAuth!: RemoteAuthJType;
  protected RemoteAuth?: RemoteAuthDAO;
  protected Disk?: DiskDAO;
  protected Thumbs?: DiskDAO;

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      createdAt: this.createdAt,
      remoteAuth: this.remoteAuth,
      disk: this.disk,
      thumbs: this.thumbs,
    };
  }

  static rootRoute = "/workspace";

  static FromJSON(json: WorkspaceRecord) {
    return new WorkspaceDAO({
      name: json.name,
      guid: json.guid,
      disk: json.disk,
      thumbs: json.thumbs,
      remoteAuth: json.remoteAuth,
      createdAt: json.createdAt,
    });
  }

  static async allRecords() {
    return ClientDb.workspaces.toArray();
  }
  get href() {
    return `${Workspace.rootRoute}/${this.name}`;
  }
  static async all() {
    const workspaceRecords = await ClientDb.workspaces.toArray();
    return workspaceRecords.map((ws) => new WorkspaceDAO(ws));
  }
  static async nameExists(name: string) {
    const result = await WorkspaceDAO.fetchFromName(name, {
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
      createdAt: this.createdAt,
    });
  };
  static async create(
    name: string,
    remoteAuth: RemoteAuthDAO = RemoteAuthDAO.new(),
    // disk: DiskDAO = DiskDAO.new(MemDisk.type),
    // thumbs: DiskDAO = DiskDAO.new(MemDisk.type)
    // disk: DiskDAO = DiskDAO.new(OpFsDisk.type),
    // thumbs: DiskDAO = DiskDAO.new(OpFsDisk.type)
    disk: DiskDAO = DiskDAO.New(IndexedDbDisk.type),
    thumbs: DiskDAO = DiskDAO.New(IndexedDbDisk.type)
    // disk: DiskDAO = DiskDAO.new(ZenWebstorageFSDbDisk.type),
    // thumbs: DiskDAO = DiskDAO.new(ZenWebstorageFSDbDisk.type)
  ) {
    let uniqueName = WorkspaceDAO.Slugify(name);
    let inc = 0;
    while (await WorkspaceDAO.nameExists(uniqueName)) {
      uniqueName = `${name}-${++inc}`;
    }
    const workspace = new WorkspaceDAO({
      name: uniqueName,
      guid: WorkspaceDAO.guid(),
      disk: disk.toJSON(),
      thumbs: thumbs.toJSON(),
      remoteAuth: remoteAuth.toJSON(),
      createdAt: new Date(),
    });
    await ClientDb.transaction("rw", ClientDb.disks, ClientDb.remoteAuths, ClientDb.workspaces, async () => {
      return await Promise.all([disk.save(), thumbs.save(), remoteAuth.save(), workspace.save()]);
    });

    return new Workspace({ ...workspace, remoteAuth, disk, thumbs });
  }
  static async byName(name: string) {
    const ws = await ClientDb.workspaces.where("name").equals(name).first();
    if (!ws) throw new NotFoundError("Workspace not found: " + name);
    return new WorkspaceDAO(ws);
  }
  static async byGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError("Workspace not found: " + guid);

    const wsd = new WorkspaceDAO(ws);

    const [auth, disk, thumbs] = await Promise.all([wsd.getRemoteAuth(), wsd.getDisk(), wsd.getThumbs()]);

    return new Workspace({ ...wsd, remoteAuth: auth, disk, thumbs });
  }
  async withRelations() {
    const [auth, disk] = await Promise.all([this.getRemoteAuth(), this.getDisk()]);
    this.RemoteAuth = auth;
    this.Disk = disk;
    return this;
  }
  static Slugify(name: string) {
    return slugify(name, { strict: true });
  }
  async toModel() {
    const [auth, disk, thumbs] = await Promise.all([
      this.RemoteAuth ? Promise.resolve(this.RemoteAuth) : this.getRemoteAuth(),
      this.Disk ? Promise.resolve(this.Disk) : this.getDisk(),
      this.Thumbs ? Promise.resolve(this.Thumbs) : this.getThumbs(),
    ]);
    return new Workspace({ ...this, remoteAuth: auth, disk, thumbs });
  }

  private async getRemoteAuth() {
    const remoteAuth = await ClientDb.remoteAuths.where("guid").equals(this.remoteAuth.guid).first();
    if (!remoteAuth) throw new NotFoundError("RemoteAuth not found");
    return new RemoteAuthDAO(remoteAuth);
  }

  async getDisk() {
    const disk = await ClientDb.disks.where("guid").equals(this.disk.guid).first();

    if (!disk) throw new NotFoundError("Disk not found");
    return new DiskDAO(disk);
  }

  async getThumbs() {
    const thumbs = await ClientDb.disks.where("guid").equals(this.thumbs.guid).first();

    if (!thumbs) throw new NotFoundError("Thumbs not found");
    return new DiskDAO(thumbs);
  }

  static async fetchFromRoute(route: string) {
    if (!isAncestor(route, Workspace.rootRoute)) throw new BadRequestError("Invalid route " + route);

    const name = route.slice(Workspace.rootRoute.length + 1).split("/")[0];

    const ws =
      (await ClientDb.workspaces.where("name").equals(name).first()) ??
      (await ClientDb.workspaces.where("guid").equals(name).first());
    if (!ws) throw new NotFoundError(errF`Workspace not found name:${name}, guid:${name}`);
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }
  static async fetchFromGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError(errF`Workspace not found guid:${guid}`);
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }
  static async fetchFromName(name: string): Promise<Workspace>;
  static async fetchFromName(name: string, options: { throwNotFound: boolean }): Promise<Workspace | null>;
  static async fetchFromName(
    name: string,
    options: { throwNotFound: boolean } = { throwNotFound: true }
  ): Promise<Workspace | null> {
    const ws = await ClientDb.workspaces.where("name").equals(name).first();
    if (!ws) {
      if (!options.throwNotFound) return null;
      throw new NotFoundError(errF`Workspace not found name:${name}`);
    }
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }

  static async fetchFromGuidAndInit(guid: string) {
    return (await WorkspaceDAO.fetchFromGuid(guid)).init();
  }
  static async fetchFromNameAndInit(name: string) {
    return (await WorkspaceDAO.fetchFromName(name)).init();
  }

  static async fetchFromRouteAndInit(route: string) {
    return (await WorkspaceDAO.fetchFromRoute(route)).init();
  }

  constructor(properties: WorkspaceRecord) {
    Object.assign(this, properties);
  }
}
