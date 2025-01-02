import { ClientDb } from "@/clientdb/instance";
import { FileTree } from "@/disk/filetree";
import { errorCode } from "@/lib/errors";
import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";
import { nanoid } from "nanoid";
import path from "path";

export type DiskJType = { guid: string; type: DiskType; fs: Record<string, string> };

export type DiskType = IndexedDbDisk["type"] | MemDisk["type"];

export type FsType = InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

export interface DiskRecord {
  guid: string;
  type: DiskType;
}
export class DiskDbRecord implements DiskRecord {
  public guid!: string;
  public type!: DiskType;
}

export abstract class Disk implements DiskRecord {
  abstract fs: FsType;

  static defaultDiskType: DiskType = "IndexedDbDisk";

  abstract db: typeof ClientDb;

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: DiskType = Disk.defaultDiskType) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }
  static fromJSON(json: Partial<DiskRecord | Disk> & Pick<DiskRecord, "guid">) {
    if (json instanceof Disk) return json;
    return json.type === "IndexedDbDisk" ? new IndexedDbDisk(json.guid) : new MemDisk(json.guid);
  }

  abstract readonly fileTree: FileTree;

  writeFiles(files: Record<string, string>) {
    const promises: Promise<void>[] = [];
    for (const [filePath, content] of Object.entries(files)) {
      const writeFile = async (filePath: string, content: string) => {
        try {
          await this.fs.promises.mkdir(path.dirname(filePath), { recursive: true, mode: 0o777 });
        } catch (err) {
          if (errorCode(err).code !== "EEXIST") {
            console.error(`Error creating directory ${path.dirname(filePath)}:`, err);
          }
        }
        try {
          await this.fs.promises.writeFile(filePath, content, { encoding: "utf8", mode: 0o777 });
        } catch (err) {
          console.error(`Error writing file ${filePath}:`, err);
        }
      };

      promises.push(writeFile(filePath, content));
    }
    return Promise.all(promises);
  }

  toJSON() {
    return { guid: this.guid, type: this.type } as DiskRecord;
  }
  create() {
    return this.db.updateDisk(this.toJSON());
  }
  load() {
    return this.db.getDiskByGuid(this.guid);
  }

  abstract readonly type: DiskType;
  abstract readonly guid: string;
  abstract init(): Promise<this>;

  get promises() {
    return this.fs.promises;
  }
  get tree() {
    return this.fileTree;
  }
}
export class IndexedDbDisk extends Disk {
  // static db = ClientDb;

  readonly type = "IndexedDbDisk";

  public readonly fs: InstanceType<typeof LightningFs>;
  readonly fileTree: FileTree;

  async init() {
    await this.fileTree.build();
    return this;
  }
  constructor(public readonly guid: string, public readonly db = ClientDb) {
    super();
    this.fs = new LightningFs();
    this.fs.init(this.guid);
    this.fileTree = new FileTree(this.fs, this.guid);
  }
}

export class MemDisk extends Disk {
  // static db = ClientDb;
  readonly type = "MemDisk";
  public readonly fs: ReturnType<typeof memfs>["fs"];
  readonly fileTree: FileTree; // = new FileTree(this.fs);
  constructor(public readonly guid: string, public readonly db = ClientDb) {
    super();
    throw new Error("do not use me!");
    this.fs = memfs().fs;
    this.fileTree = new FileTree(this.fs, this.guid);
  }
  async init() {
    await this.fileTree.build();
    return this;
  }
}
