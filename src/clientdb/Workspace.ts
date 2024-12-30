import { ClientIndexedDb } from "@/clientdb";
import { ClientDb } from "@/clientdb/instance";
import { Disk, FSTypes as FSType, FSTypes } from "@/disk/disk";
import ProviderAuth from "@/oauthprovider";
import { Entity } from "dexie";
import { customAlphabet, nanoid } from "nanoid";
import { ProviderAuthDbRecord, ProviderAuthRecord } from "./Provider";

// export class WorkspaceDbRecord extends Entity<ClientIndexedDb> implements WorkspaceRecord {
export class WorkspaceDbRecord extends Entity<ClientIndexedDb> implements WorkspaceRecord {
  id!: number;
  name!: string;
  type!: FSTypes;
  guid!: string;
  href!: string;
  createdAt!: Date;
  providerAuthId!: number;
  providerAuth?: ProviderAuthRecord;
  diskGuid!: string;
  disk?: Disk;

  constructor() {
    super();
  }

  async loadDisk() {
    if (this.disk) return this.disk;
    const disk = await this.db.disks.get(this.diskGuid);
    if (!disk) throw new Error("Disk not found");
    return (this.disk = disk);
  }
  async setDisk(disk: Disk) {
    await this.db.disks.put(disk);
    this.disk = disk;
    this.diskGuid = disk.guid;
  }
  async mountDisk() {
    await this.loadDisk();
    await this.disk!.mount();
  }

  async loadProvider() {
    return (this.providerAuth = await this.db.providerAuths.where("id").equals(this.providerAuthId).first());
  }
  async setProvider(provider: ProviderAuthRecord) {
    await this.db.providerAuths.put(provider);
    this.providerAuth = provider;
    this.providerAuthId = this.providerAuth.id;
  }
}
//TODO donno if i need this simpler interface or if i should just use workspaceDB for everthing

export interface WorkspaceRecord {
  id: number;
  guid: string;
  name: string;
  diskGuid: string;
  type: FSTypes;
  href: string;
  createdAt: Date;
  providerAuthId: number;
  ProviderAuth?: ProviderAuthDbRecord;
  disk?: Disk;
}

export class Workspace implements WorkspaceRecord {
  static db = ClientDb; //todo ... dep inj?
  static routeRoot = "/workspace";
  private _id: number = 0;
  guid: string;
  name: string;
  diskGuid: string;
  disk?: Disk;
  type: FSTypes;
  href: string;
  createdAt: Date;
  providerAuthId: number;
  ProviderAuth?: ProviderAuthDbRecord;
  constructor(name: string, type: FSTypes = "IndexedDbDisk") {
    this.guid = nanoid();
    this.diskGuid = this.guid;
    this.name = name;
    this.type = type;
    this.providerAuthId = 0;
    this.href = `${Workspace.routeRoot}/${name}`;
    this.createdAt = new Date();
  }
  get id() {
    return this._id;
  }
  async save() {
    const id = await Workspace.db.workspaces.put(this);
    this._id = id;
    return this;
  }
  fetch() {
    return Workspace.db.workspaces.get({ guid: this.guid }); //todo: id?
  }
}

function slug() {
  return customAlphabet("1234567890abcdef", 16);
}

export class BetterWorkspace implements WorkspaceRecord {
  static db = ClientDb;
  static routeRoot = "/workspace";
  static guid = () => "workspace:" + nanoid();

  static async all({ provider, disk } = { provider: false, disk: false }) {
    const workspaceRecords = await BetterWorkspace.db.workspaces.toArray();
    const workspaces = workspaceRecords.map((record) => {
      const workspace = new BetterWorkspace(record.name);
      workspace.id = record.id;
      workspace.guid = record.guid;
      workspace.href = record.href;
      workspace.createdAt = record.createdAt;
      workspace.providerAuthId = record.providerAuthId;
      workspace.diskGuid = record.diskGuid;
      return workspace;
    });
    for (const workspace of workspaces) {
      if (provider) await workspace.loadProvider();
      if (disk) await workspace.loadDisk();
    }
  }

  name: string;
  id: number = 0;
  guid: string = nanoid();
  href: string = "";
  db: ClientIndexedDb;
  createdAt: Date = new Date();
  disk: Disk;
  diskGuid: string = "";
  providerAuthGuid: string = "";
  providerAuth?: ProviderAuthRecord;

  constructor(name: string, providerAuthGuid?: string, diskGuid?: string, db?: ClientIndexedDb) {
    this.db = db ?? BetterWorkspace.db;
    this.diskGuid = disk;
    this.name = name ?? "workspace_" + slug();
    this.href = `${BetterWorkspace.routeRoot}/${name}`;
  }

  async create() {
    const id = await BetterWorkspace.db.workspaces.put(this.toJSON());
    this.id = id;
    return this;
  }
  async crupdate() {
    if (this.id) return this.update();
    return this.create();
  }
  async update() {
    if (!this.id) throw new Error("Workspace must be saved before updating");
    await BetterWorkspace.db.workspaces.update(this.id, this.toJSON());
    return this;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      guid: this.guid,
      href: this.href,
      createdAt: this.createdAt,
      providerAuthId: this.providerAuthId,
      diskGuid: this.disk.guid,
    } satisfies Omit<WorkspaceRecord, "id">;
  }

  async loadDisk() {
    if (this.disk) return this.disk;
    const disk = await this.db.disks.get(this.diskGuid);
    if (!disk) throw new Error("Disk not found");
    return (this.disk = disk);
  }
  async setDisk(disk: Disk) {
    await this.db.disks.put(disk);
    this.disk = disk;
    this.diskGuid = disk.guid;
  }
  async mountDisk() {
    await this.loadDisk();
    await this.disk!.mount();
  }

  async loadProvider() {
    return (this.providerAuth = await this.db.providerAuths.where("id").equals(this.providerAuthId).first());
  }
  async setProvider(provider: ProviderAuthRecord) {
    await this.db.providerAuths.put(provider);
    this.providerAuth = provider;
    this.providerAuthId = this.providerAuth.id;
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
