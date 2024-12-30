import { ClientDb } from "@/clientdb/instance";
import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";
import { nanoid } from "nanoid";

export type FSJType = { guid: string; type: FSTypes; fs: Record<string, string> };

export type FSTypes = IndexedDbDisk["type"] | MemDisk["type"];

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  href: string;
  depth: number;
};

class FileTree {
  async walkTree(
    dir: string,
    fn: (path: string, parent: TreeDir, stat: Awaited<ReturnType<typeof this.promises.stat>>, depth: number) => void,
    parent: TreeDir,
    depth = 0,
    haltOnError = false
  ) {
    try {
      this.fs.promises.readdir(dir);
      const entries = await this.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = `${dir}/${entry}`;
        const stat = await this.promises.stat(fullPath);
        fn(fullPath, parent, stat, depth + 1);
        if (stat.isDirectory()) {
          const treeDir: TreeDir = { name: entry.toString(), depth, type: "dir", path: fullPath, children: [] };
          await this.walkTree(fullPath, fn, treeDir, depth + 1, haltOnError);
        } else {
          const treeFile: TreeFile = { name: entry.toString(), depth, type: "file", path: fullPath, href: fullPath };
          parent.children.push(treeFile);
        }
      }
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
    }
  }
}

export type TreeNode = TreeDir | TreeFile;

export type TreeList = Array<string>;

export type TreeDir = {
  children: Array<TreeNode>;
  name: string;
  type: "dir";
  path: string;
  depth: number;
};
export interface DiskRecord {
  guid: string;
  type: FSTypes;
}
export class DiskDbRecord implements DiskRecord {
  public guid!: string;
  public type!: FSTypes;
}

export abstract class Disk implements DiskRecord {
  abstract fs: InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

  abstract db: typeof ClientDb;

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: FSTypes = "IndexedDbDisk") {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }
  static fromJSON(json: Partial<DiskRecord | Disk> & Pick<DiskRecord, "guid">) {
    if (json instanceof Disk) return json;
    return json.type === "IndexedDbDisk" ? new IndexedDbDisk(json.guid) : new MemDisk(json.guid);
  }

  tree: string[] = [];

  async init() {
    await this.mount();
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

  abstract readonly type: FSTypes;
  abstract readonly guid: string;
  abstract mount(): Promise<void>;

  get promises() {
    return this.fs.promises;
  }

  async loadTree() {
    const result: string[] = [];

    const traverse = async (dir: string) => {
      try {
        const entries = await this.promises.readdir(dir);
        for (const entry of entries) {
          const fullPath = `${dir}/${entry}`;
          const stat = await this.promises.stat(fullPath);
          if (stat.isDirectory()) {
            await traverse(fullPath);
          } else if (stat.isFile()) {
            result.push(fullPath);
          }
        }
      } catch (err) {
        console.error(`Error reading ${dir}:`, err);
      }
    };

    await traverse("/");

    return result;
  }
}
export class IndexedDbDisk extends Disk {
  static db = ClientDb;

  readonly type = "IndexedDbDisk";
  public readonly fs: InstanceType<typeof LightningFs>;
  async mount() {
    await this.fs.init(this.guid); //needed?
    await this.loadTree();
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
  async mount() {
    await this.loadTree();
  }
}
