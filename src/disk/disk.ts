import { ClientDb } from "@/clientdb/instance";
import LightningFs from "@isomorphic-git/lightning-fs";
import { memfs } from "memfs";
import { nanoid } from "nanoid";

export type DiskJType = { guid: string; type: DiskType; fs: Record<string, string> };

export type DiskType = IndexedDbDisk["type"] | MemDisk["type"];

export type FsType = InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

export type TreeFile = {
  name: string;
  type: "file";
  path: string;
  href: string;
  depth: number;
};

class FileTree {
  root: TreeDir = {
    name: "/",
    path: "/",
    type: "dir",
    children: [],
    depth: 0,
  };
  tree: TreeDir | string[] = this.root;
  constructor(private fs: FsType) {}

  async build(type: "nested" | "flat" = "nested") {
    if (type === "nested") {
      await FileTree.recurseTree(this.root.path, this.root.children, type, 0, false, this.fs);
      return this.root;
    } else {
      const parent: string[] = [];
      await FileTree.recurseTree(this.root.path, parent, type, 0, false, this.fs);
      return parent;
    }
  }

  static recurseTree = async (
    dir: string,
    parent: (TreeNode | string)[] = [],
    type: "flat" | "nested" = "nested",
    depth = 0,
    haltOnError = false,
    fs: FsType
  ) => {
    try {
      const entries = await fs.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = `${dir}/${entry}`;
        const stat = await fs.promises.stat(fullPath);
        let nextParent = null;
        let treeEntry: TreeDir | TreeFile | string = "";

        if (stat.isDirectory()) {
          if (type === "flat") {
            treeEntry = fullPath;
            nextParent = parent;
          } else {
            treeEntry = { name: entry.toString(), depth, type: "dir", path: fullPath, children: [] };
            nextParent = treeEntry.children;
          }
          await FileTree.recurseTree(fullPath, nextParent, type, depth + 1, haltOnError, fs);
        } else {
          if (type === "flat") {
            treeEntry = fullPath;
          } else {
            treeEntry = { name: entry.toString(), depth, type: "file", path: fullPath, href: fullPath };
          }
        }

        parent.push(treeEntry);
      }
      // return parent;
    } catch (err) {
      console.error(`Error reading ${dir}:`, err);
      if (haltOnError) {
        throw err;
      }
      // return parent;
    }
  };
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
  type: DiskType;
}
export class DiskDbRecord implements DiskRecord {
  public guid!: string;
  public type!: DiskType;
}

export abstract class Disk implements DiskRecord {
  abstract fs: FsType;

  abstract db: typeof ClientDb;

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: DiskType = "IndexedDbDisk") {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }
  static fromJSON(json: Partial<DiskRecord | Disk> & Pick<DiskRecord, "guid">) {
    if (json instanceof Disk) return json;
    return json.type === "IndexedDbDisk" ? new IndexedDbDisk(json.guid) : new MemDisk(json.guid);
  }

  abstract readonly fileTree: FileTree;

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

  abstract readonly type: DiskType;
  abstract readonly guid: string;
  abstract mount(): Promise<this>;

  get promises() {
    return this.fs.promises;
  }
  get tree() {
    return this.fileTree.tree;
  }
}
export class IndexedDbDisk extends Disk {
  static db = ClientDb;

  readonly type = "IndexedDbDisk";

  readonly fileTree = new FileTree(this.fs);
  public readonly fs: InstanceType<typeof LightningFs>;

  async mount() {
    await this.fs.init(this.guid);
    await this.fileTree.build();
    return this;
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
  readonly fileTree = new FileTree(this.fs);
  constructor(public readonly guid: string, public readonly db = MemDisk.db) {
    super();
    this.fs = memfs().fs;
  }
  async mount() {
    await this.fileTree.build();
    return this;
  }
}
