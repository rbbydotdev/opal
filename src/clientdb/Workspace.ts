import { ClientIndexedDb } from "@/clientdb";
import { ClientDb } from "@/clientdb/instance";
import { Disk, FSTypes } from "@/disk/disk";
import { Entity } from "dexie";
import { nanoid } from "nanoid";
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
  // id: number;
  guid: string;
  name: string;
  diskGuid: string;
  disk?: Disk;
  type: FSTypes;
  href: string;
  createdAt: Date;
  providerAuthId: number;
  ProviderAuth?: ProviderAuthDbRecord;
}

export class Workspace implements WorkspaceRecord {
  static db = ClientDb; //todo ... dep inj?
  static routeRoot = "/workspace";
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
  save() {
    return Workspace.db.workspaces.put(this);
  }
  fetch() {
    return Workspace.db.workspaces.get({ guid: this.guid }); //todo: id?
  }
}
