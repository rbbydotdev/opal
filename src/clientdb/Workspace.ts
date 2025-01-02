import { ClientIndexedDb } from "@/clientdb";
import { ClientDb } from "@/clientdb/instance";
import { Disk, DiskRecord } from "@/disk/disk";
// import { randomSlug } from "@/lib/randomSlug";
import { randomSlug } from "@/lib/randomSlug";
import { nanoid } from "nanoid";
import { RemoteAuthRecord } from "./Provider";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  diskGuid!: string | null;
  href!: string;
  createdAt!: Date;
  remoteAuthGuid!: string | null;
  remoteAuth?: RemoteAuthRecord;
  disk?: Disk;
}

// export interface WorkspaceRecord {
//   guid: string;
//   name: string;
//   diskGuid: string | null;
//   href: string;
//   createdAt: Date;
//   remoteAuthGuid: string | null;
//   remoteAuth?: RemoteAuthRecord;
//   disk?: Disk;
// }

//TODO: change the mututation of this class to instead have a database tied object, but when othere deps are loaded it beomces a different object
//for exampple the diskguid
export class Workspace implements WorkspaceRecord {
  static seedFiles: Record<string, string> = {
    "/welcome.md": "# Welcome to your new workspace!",
    "/home/post1.md": "# Hello World!",
    "/drafts/draft1.md": "# Goodbye World!",
    "/ideas/ideas.md": "# Red Green Blue",
  };

  db: ClientIndexedDb = ClientDb;
  createdAt: Date = new Date();
  name: string;
  guid: string;
  remoteAuthGuid: string | null = null;
  diskGuid: string | null = null;

  private _remoteAuth?: RemoteAuthRecord;
  private _disk?: Disk;

  // static db = ClientDb;

  static new(name: string) {
    const ws = new Workspace({ guid: Workspace.guid() });
    ws.name = name;
    return ws;
  }
  static fetchLoadAndMountDisk(guid: string) {
    return new Workspace({ guid }).loadFromDbAndMountDisk();
  }

  static rootRoute = "/workspace";
  // static getRoute = (name: string) => `${Workspace.routeRoot}/${name}`;
  static guid = () => "workspace:" + nanoid();

  static fromJSON(json: Partial<WorkspaceRecord> & Pick<WorkspaceRecord, "guid">) {
    const workspace = new Workspace({ guid: json.guid });
    Object.assign(workspace, json);
    return workspace;
  }

  static async fromRoute(route: string) {
    if (!route.startsWith(Workspace.rootRoute)) throw new Error("Invalid route");
    const name = route.slice(Workspace.rootRoute.length + 1);
    await ClientDb.getWorkspaceByName(name);
  }

  static fromGuid(guid: string) {
    return new Workspace({ guid });
  }

  static async all({ provider, disk } = { provider: false, disk: false }) {
    const workspaceRecords = await ClientDb.allWorkspaces(); //TODO dep inj db?
    const workspaces = workspaceRecords.map((ws) => Workspace.fromJSON(ws));
    for (const workspace of workspaces) {
      const p1 = provider ? workspace.loadRemoteAuth() : null;
      const p2 = disk ? workspace.loadDisk() : null;
      if (p1 || p2) await Promise.all([p1, p2]);
    }
  }

  constructor({ guid, name }: { guid?: string; name?: string }) {
    if (!guid && !name) throw new Error("Workspace must have a name or guid");
    this.name = name || randomSlug();
    this.guid = guid || Workspace.guid();
  }

  async loadFromDbAndMountDisk() {
    const ws = this.guid ? await this.db.getWorkspaceByGuid(this.guid) : await this.db.getWorkspaceByName(this.name);
    if (!ws) throw new Error("Workspace not found");
    Object.assign(this, {
      guid: ws.guid,
      name: ws.name,
      diskGuid: ws.diskGuid,
      createdAt: ws.createdAt,
      remoteAuthGuid: ws.remoteAuthGuid,
    });
    await this.mountDisk();
    return this;
  }

  //should this just be the default create?
  async createWithSeedFiles(files = Workspace.seedFiles) {
    await this.create();
    this.disk!.writeFiles(files);
    return this;
  }
  async create() {
    //check first if disk exists
    if (!this.disk?.guid) {
      this.disk = Disk.new();
      // await this.disk!.mount(); ?
      await this.disk!.create();
    }
    const guid = await this.db.updateWorkspace(this.toJSON());
    this.guid = guid;
    return this;
  }
  async update() {
    await this.db.workspaces.update(this.guid, this.toJSON());
    return this;
  }

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      createdAt: this.createdAt,
      remoteAuthGuid: this.remoteAuthGuid,
      diskGuid: this.diskGuid,
    } satisfies WorkspaceRecord;
  }

  async loadDisk(diskGuid: string | null = this.diskGuid) {
    if (this.disk) return this.disk;
    if (diskGuid == null || diskGuid == undefined) {
      throw new Error("Disk guid not set");
    }
    const disk = await this.db.disks.get(diskGuid);
    if (!disk) throw new Error("Disk not found");
    return (this.disk = Disk.fromJSON(disk));
  }
  async setDisk(disk: Disk | DiskRecord) {
    //Todo idk if serilization is needed ?
    await this.db.updateDisk(disk);
    this.disk = Disk.fromJSON(disk);
    // this.diskGuid = disk.guid;
  }

  async loadRemoteAuth() {
    if (!this.remoteAuth) {
      throw new Error("RemoteAuth not set");
    }
    const remoteAuth = await this.db.getRemoteAuthByGuid(this.remoteAuth.guid);
    if (remoteAuth === undefined) {
      throw new Error("RemoteAuth not found");
    }
    return (this.remoteAuth = remoteAuth);
  }
  async setRemoteAuth(remote: RemoteAuthRecord) {
    await this.db.updateRemoteAuth(remote);
    this.remoteAuth = remote;
    // this.remoteAuthGuid = this.remoteAuth.guid;
  }

  mountDisk() {
    return this.loadDisk().then((disk) => disk.init());
  }
  resolveFileUrl(filePath: string) {
    return this.href + filePath;
  }
  teardown() {}

  get fileTree() {
    if (!this.disk) return this.disk!.fileTree.children;
  }

  get href() {
    return `${Workspace.rootRoute}/${this.name}`;
  }
  set disk(disk: Disk | undefined) {
    if (!disk) return;
    this._disk = disk;
    this.diskGuid = this._disk.guid;
  }
  get disk() {
    return this._disk;
  }
  get remoteAuth() {
    return this._remoteAuth;
  }
  set remoteAuth(remoteAuth: RemoteAuthRecord | undefined) {
    if (!remoteAuth) return;
    this._remoteAuth = remoteAuth;
    this.remoteAuthGuid = this._remoteAuth.guid;
  }
}

// export class Workspace2 extends Workspace {

// }
