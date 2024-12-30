import { ClientIndexedDb } from "@/clientdb";
import { ClientDb } from "@/clientdb/instance";
import { Disk, DiskRecord } from "@/disk/disk";
import { randomSlug } from "@/lib/randomSlug";
import { Entity } from "dexie";
import { nanoid } from "nanoid";
import { RemoteAuthDbRecord, RemoteAuthRecord } from "./Provider";

export class WorkspaceDbRecord extends Entity<ClientIndexedDb> implements WorkspaceRecord {
  guid!: string;
  name!: string;
  diskGuid!: string;
  href!: string;
  createdAt!: Date;
  remoteAuthGuid!: string;
  remoteAuth?: RemoteAuthDbRecord;
  disk?: Disk;
}

export interface WorkspaceRecord {
  guid: string;
  name: string;
  diskGuid: string;
  href: string;
  createdAt: Date;
  remoteAuthGuid: string;
  remoteAuth?: RemoteAuthRecord;
  disk?: Disk;
}

export class Workspace implements WorkspaceRecord {
  name: string = "workspace_" + randomSlug();
  href: string = "";
  db: ClientIndexedDb = Workspace.db;
  createdAt: Date = new Date();
  diskGuid: string = "";
  disk?: Disk;
  remoteAuthGuid: string = "";
  remoteAuth?: RemoteAuthRecord;

  static db = ClientDb;

  static new(name: string) {
    const ws = new Workspace();
    ws.name = name;
    return ws;
  }
  static fetchLoadAndMountDisk(guid: string) {
    return new Workspace(guid).loadAndMountDisk();
  }

  static routeRoot = "/workspace";
  static guid = () => "workspace:" + nanoid();

  static fromJSON(json: Partial<WorkspaceRecord> & Pick<WorkspaceRecord, "guid">) {
    const workspace = new Workspace(json.guid);
    Object.assign(workspace, json);
    return workspace;
  }

  static fromGuid(guid: string) {
    return new Workspace(guid);
  }

  static async all({ provider, disk } = { provider: false, disk: false }) {
    const workspaceRecords = await this.db.allWorkspaces();
    const workspaces = workspaceRecords.map((ws) => Workspace.fromJSON(ws));
    for (const workspace of workspaces) {
      const p1 = provider ? workspace.loadRemoteAuth() : null;
      const p2 = disk ? workspace.loadDisk() : null;
      if (p1 || p2) await Promise.all([p1, p2]);
    }
  }

  constructor(public guid: string = Workspace.guid()) {}

  async loadAndMountDisk() {
    return this.load(true);
  }
  async load(mountDisk = false) {
    const ws = await this.db.getWorkspaceByGuid(this.guid);
    Object.assign(this, ws);
    if (mountDisk) await this.mountDisk();
    return this;
  }

  async create() {
    //check first if disk exists
    if (!this.disk || !this.disk.guid) {
      this.disk = Disk.new("IndexedDbDisk", this.diskGuid);
      await this.disk!.mount();
      await this.disk!.create();
    }
    const guid = await this.db.updateWorkspace(this);
    this.guid = guid;
    return this;
  }
  async update() {
    await Workspace.db.workspaces.update(this.guid, this.toJSON());
    return this;
  }

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      createdAt: this.createdAt,
      remoteAuthGuid: this.remoteAuthGuid,
      diskGuid: this.disk?.guid ?? "",
    } satisfies WorkspaceRecord;
  }

  async loadDisk() {
    if (this.disk) return this.disk;
    const disk = await this.db.disks.get(this.diskGuid);
    if (!disk) throw new Error("Disk not found");
    return (this.disk = Disk.fromJSON(disk));
  }
  async setDisk(disk: Disk | DiskRecord) {
    //Todo idk if serilization is needed ?
    await this.db.updateDisk(disk);
    this.disk = Disk.fromJSON(disk);
    this.diskGuid = disk.guid;
  }
  async mountDisk() {
    await this.loadDisk();
    await this.disk!.mount();
  }

  async loadRemoteAuth() {
    return (this.remoteAuth = await this.db.getRemoteAuthByGuid(this.remoteAuthGuid));
  }
  async setRemoteAuth(remote: RemoteAuthRecord) {
    await this.db.updateRemoteAuth(remote);
    this.remoteAuth = remote;
    this.remoteAuthGuid = this.remoteAuth.guid;
  }
}

/*
use cases:


User interface make new workspace:

  const myWorkspace = new Workspace(name: "myWorkspace");
  await myWorkspace.create();
  router.redirect(myWorkspace.href);


Load workspace from url:
  
    const workspace = await Workspace.fromUrl(router.pathname);
    await workspace.loadDisk();
    await workspace.loadProvider();
  
    //or
    const workspace = await Workspace.fromUrl(router.pathname, { disk: true, provider: true });
  
    //or
    const workspace = await Workspace.fromUrl(router.pathname, { disk: true, provider: true });
    await workspace.mountDisk();

List all workspaces: 
  
      const workspaces = await Workspace.all();
  
      //or
      const workspaces = await Workspace.all({ disk: true, provider: true });
  
      //or
      const workspaces = await Workspace.all({ disk: true, provider: true });
      for (const workspace of workspaces) {
        await workspace.mountDisk();
      }

*/

// export class WorkspaceDbRecord extends Entity<ClientIndexedDb> implements WorkspaceRecord {
//   name!: string;
//   guid!: string;
//   href!: string;
//   createdAt!: Date;
//   RemoteAuthGuid!: string;
//   RemoteAuth?: RemoteAuthRecord;
//   diskGuid!: string;
//   disk?: Disk;

//   constructor() {
//     super();
//   }

//   async loadDisk() {
//     if (this.disk) return this.disk;
//     const disk = await this.db.disks.get(this.diskGuid);
//     if (!disk) throw new Error("Disk not found");
//     return (this.disk = Disk.fromJSON(disk));
//   }
//   async setDisk(disk: Disk) {
//     await this.db.disks.put(disk);
//     this.disk = disk;
//     this.diskGuid = disk.guid;
//   }
//   async mountDisk() {
//     await this.loadDisk();
//     await this.disk!.mount();
//   }

//   async loadProvider() {
//     return (this.RemoteAuth = await this.db.RemoteAuths.where("id").equals(this.RemoteAuthGuid).first());
//   }
//   async setProvider(provider: RemoteAuthRecord) {
//     await this.db.updateRemoteAuth(provider);
//     this.RemoteAuth = provider;
//     this.RemoteAuthGuid = this.RemoteAuth.guid;
//   }
// }
// //TODO donno if i need this simpler interface or if i should just use workspaceDB for everthing

// export class Workspace implements WorkspaceRecord {
//   static db = ClientDb; //todo ... dep inj?
//   static routeRoot = "/workspace";
//   guid: string;
//   name: string;
//   diskGuid: string;
//   disk?: Disk;
//   type: FSTypes;
//   href: string;
//   createdAt: Date;
//   RemoteAuthGuid: string;
//   RemoteAuth?: RemoteAuthDbRecord;
//   constructor(name: string, type: FSTypes = "IndexedDbDisk", private db: ClientIndexedDb = Workspace.db) {
//     this.guid = nanoid();
//     this.diskGuid = this.guid;
//     this.name = name;
//     this.type = type;
//     this.RemoteAuthGuid = "";
//     this.href = `${Workspace.routeRoot}/${name}`;
//     this.createdAt = new Date();
//   }
//   async save() {
//     const guid = await this.db.updateWorkspace(this);
//     this.guid = guid;
//     return this;
//   }
//   fetch() {
//     return this.db.getDiskByGuid(this.guid);
//   }
// }

// this.db = db ?? BetterWorkspace.db;
// this.name = name ??
// this.href = `${BetterWorkspace.routeRoot}/${name}`;
// this.RemoteAuthGuid = RemoteAuthGuid ?? "";
// this.diskGuid = diskGuid ?? "";
