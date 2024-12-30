import { ClientDb } from "@/clientdb/instance";
import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";
import { nanoid } from "nanoid";

export type FSJType = { guid: string; type: FSTypes; fs: Record<string, string> };

export type FSTypes = IndexedDbDisk["type"] | MemDisk["type"];

export interface DiskRecord {
  guid: string;
  type: FSTypes;
}
export class DiskDbRecord implements DiskRecord {
  public guid!: string;
  public type!: FSTypes;
}

export abstract class Disk implements DiskRecord {
  abstract db: typeof ClientDb;

  static guid = () => "disk:" + nanoid();

  static new(type: FSTypes, guid: string = Disk.guid()) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }
  static fromJSON(json: Partial<DiskRecord | Disk> & Pick<DiskRecord, "guid">) {
    if (json instanceof Disk) return json;
    return json.type === "IndexedDbDisk" ? new IndexedDbDisk(json.guid) : new MemDisk(json.guid);
  }
  toJSON() {
    return { guid: this.guid, type: this.type } as DiskRecord;
  }
  create() {
    return this.db.updateDisk(this);
  }
  load() {
    return this.db.getDiskByGuid(this.guid);
  }

  abstract readonly type: FSTypes;
  abstract readonly guid: string;
  abstract fs: InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];
  abstract mount(): Promise<void>;

  get promises() {
    return this.fs.promises;
  }
}

export class IndexedDbDisk extends Disk {
  static db = ClientDb;
  readonly type = "IndexedDbDisk";
  public readonly fs: InstanceType<typeof LightningFs>;
  async mount() {
    await this.fs.init(this.guid); //needed?
  }

  constructor(public readonly guid: string, public readonly db = IndexedDbDisk.db) {
    super();
    //TODO: i am not sure if this should be moved out of the constructor and into the module or not
    this.fs = new LightningFs(guid);
  }
}

export class MemDisk extends Disk {
  static db = ClientDb;
  readonly type = "MemDisk";
  public readonly fs: ReturnType<typeof memfs>["fs"];

  constructor(public readonly guid: string, public readonly db = MemDisk.db) {
    super();
    this.fs = memfs().fs;
  }
  async mount() {}
}
