import { FileTree } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";
import { nanoid } from "nanoid";

export type DiskJType = { guid: string; type: DiskType; fs: Record<string, string> };

export type DiskType = "IndexedDbDisk" | "MemDisk";

export type FsType = InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

export class DiskRecord {
  guid!: string;
  type!: DiskType;
}

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  static guid = () => "disk:" + nanoid();
  constructor(disk: DiskRecord) {
    Object.assign(this, disk);
  }
  static new(type: DiskType = Disk.defaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid() });
  }
  static getByGuid(guid: string) {
    return ClientDb.disks.where("guid").equals(guid).first();
  }
  save() {
    return ClientDb.disks.put(this);
  }
  toModel() {
    return Disk.from(this);
  }
}
export abstract class Disk implements DiskRecord {
  abstract fs: FsType;
  abstract fileTree: FileTree;
  abstract readonly type: DiskType;
  abstract readonly guid: string;

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: DiskType = Disk.defaultDiskType) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }
  static from({ guid, type }: { guid: string; type: DiskType }) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }
  async withFs(fn: (fs: FsType) => Promise<unknown>) {
    await fn(this.fs);
    await this.fileTree.index();
    return this.fs;
  }

  toJSON() {
    return { guid: this.guid, type: this.type } as DiskRecord;
  }
  // create() {
  //   return ClientDb.updateDisk(this.toJSON());
  // }
  // load() {
  //   return ClientDb.getDiskByGuid(this.guid);
  // }

  get promises() {
    return this.fs.promises;
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";

  readonly type = IndexedDbDisk.type;

  readonly fs: InstanceType<typeof LightningFs>;
  readonly fileTree: FileTree;

  constructor(public readonly guid: string, public readonly db = ClientDb) {
    super();
    this.fs = new LightningFs();
    this.fs.init(this.guid);
    this.fileTree = new FileTree(this.fs, this.guid);
  }
}

export class MemDisk extends Disk {
  readonly type = "MemDisk";
  public readonly fs: ReturnType<typeof memfs>["fs"];
  readonly fileTree: FileTree; // = new FileTree(this.fs);
  constructor(public readonly guid: string, public readonly db = ClientDb) {
    super();
    this.fs = memfs().fs;
    this.fileTree = new FileTree(this.fs, this.guid);
  }
}
