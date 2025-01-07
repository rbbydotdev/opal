"use client";
import { FileTree, TreeDir, TreeDirRoot, TreeFile } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import { Channel } from "@/lib/channel";
import { errorCode } from "@/lib/errors";
import LightningFs from "@isomorphic-git/lightning-fs";
import Emittery from "emittery";
import { memfs } from "memfs";
import { nanoid } from "nanoid";
import path from "path";

export type DiskJType = { guid: string; type: DiskType; fs: Record<string, string> };

export type DiskType = "IndexedDbDisk" | "MemDisk";

export type FsType = InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

export class DiskRecord {
  guid!: string;
  type!: DiskType;
  indexId!: string;
}

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  indexId!: string;
  static guid = () => "disk:" + nanoid();

  constructor(disk: DiskRecord) {
    Object.assign(this, disk);
  }

  static new(type: DiskType = Disk.defaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid(), indexId: "" });
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

//todo put some of the logic in a class?

export type RenameFileType = { oldPath: string; oldName: string; newPath: string; newName: string };

export abstract class Disk implements DiskRecord {
  static INDEX = "index";
  static RENAME = "rename";
  // static REMOTE_INDEX = "remoteindex";

  remote: Channel;
  local: Emittery = new Emittery();

  async initIndex() {
    await this.index();
    await this.local.emit(Disk.INDEX);
    return;
  }

  reIndex = () => {
    return this.fileTree.index({ force: true });
  };

  getFirstFile(): TreeFile | null {
    let first = null;
    this.fileTree.walk((file, _, exit) => {
      if (file.type === "file") {
        first = file;
        exit();
      }
    });
    return first;
  }

  onInitialIndex(callback: (fileTreeDir: TreeDir) => void) {
    if (this.fileTree.initialIndex) {
      callback(this.fileTree.getRootTree());
    } else {
      this.local.once(Disk.INDEX).then(() => {
        callback(this.fileTree.getRootTree());
      });
    }
  }

  //race will call callback if there is already a fresh initialized index
  onLatestIndex(callback: (fileTree: TreeDir) => void) {
    if (this.fileTree.initialIndex) callback(this.fileTree.root);
    return this.local.on(Disk.INDEX, () => {
      callback(this.fileTree.root);
      console.debug("disk index");
    });
  }

  abstract readonly type: DiskType;

  constructor(public readonly guid: string, public fs: FsType, public fileTree: FileTree) {
    this.remote = new Channel(this.guid);
    //////// put these some where
    /////
  }
  async init() {
    console.debug("disk init");
    this.initRemoteEvents();
    await this.initIndex();
    return this;
  }

  async initRemoteEvents() {
    this.remote.on(Disk.RENAME, async (data: RenameFileType) => {
      await this.local.emit(Disk.RENAME, data);
      await this.reIndex();
      this.local.emit(Disk.INDEX);
      console.debug("remote rename", JSON.stringify(data, null, 4));
    });
  }

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: DiskType = Disk.defaultDiskType) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }

  static from({ guid, type }: { guid: string; type: DiskType }) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }

  async mkdirRecursive(filePath: string) {
    const segments = path.dirname(filePath).split("/").slice(1);
    for (let i = 1; i <= segments.length; i++) {
      try {
        await this.fs.promises.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true, mode: 0o777 });
      } catch (err) {
        if (errorCode(err).code !== "EEXIST") {
          console.error(`Error creating directory ${path.dirname(filePath)}:`, err);
        }
      }
    }
  }
  async index({ tree }: { tree?: TreeDirRoot } = {}) {
    console.debug("disk index start");
    const result = await this.fileTree.index({ tree });
    if (result === FileTree.COMPLETE) {
      console.debug("disk index complete");
    }
  }

  onRename(fn: (props: RenameFileType) => void) {
    // const listeners = [this.remote.on(Disk.RENAME, fn), this.local.on(Disk.RENAME, fn)];
    // return () => listeners.forEach((off) => off());
    return this.local.on(Disk.RENAME, fn);
  }

  async renameFile(oldPath: string, newBaseName: string): Promise<RenameFileType> {
    const cleanName = newBaseName.replace(/\//g, ":");

    const NOCHANGE: RenameFileType = {
      newPath: oldPath,
      newName: path.basename(oldPath),
      oldPath,
      oldName: path.basename(oldPath),
    };

    if (!cleanName) return NOCHANGE;
    if (cleanName === path.basename(oldPath)) return NOCHANGE;

    const fullPath = path.join(path.dirname(oldPath), cleanName);

    //check if file exists
    try {
      await this.fs.promises.stat(fullPath);
      return NOCHANGE;
    } catch (_e) {}

    await this.fs.promises.rename(oldPath, fullPath);
    await this.fileTree.reIndex();

    const CHANGE: RenameFileType = {
      newPath: fullPath,
      newName: path.basename(fullPath),
      oldName: path.basename(oldPath),
      oldPath,
    };

    await this.remote.emit(Disk.RENAME, CHANGE);
    await this.local.emit(Disk.RENAME, CHANGE);
    return CHANGE;
  }

  async writeFileRecursive(filePath: string, content: string) {
    await this.mkdirRecursive(filePath);
    try {
      await this.fs.promises.writeFile(filePath, content, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }

  async withFs(fn: (fs: FsType) => Promise<unknown> | unknown) {
    await fn(this.fs);
    await this.fileTree.reIndex();
    return this.fs;
  }

  toJSON() {
    return { guid: this.guid, type: this.type } as DiskRecord;
  }

  teardown() {
    this.remote.tearDown();
  }

  get promises() {
    return this.fs.promises;
  }
  get isIndexed() {
    return this.fileTree.initialIndex;
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  readonly type = IndexedDbDisk.type;
  // broadcaster: ChannelEmittery;

  constructor(public readonly guid: string, public readonly db = ClientDb) {
    const fs = new LightningFs();
    fs.init(guid);
    super(guid, fs, new FileTree(fs));
  }
}

export class MemDisk extends Disk {
  readonly type = "MemDisk";

  constructor(public readonly guid: string, public readonly db = ClientDb) {
    const fs = memfs().fs;
    super(guid, fs, new FileTree(fs));
  }
}

// async initIndex() {
//   await this.index();
//   return;
//   const indexCacheKey = `${this.guid}/indexCache`;
//   const cacheIndex = localStorage.getItem(indexCacheKey);
//   if (cacheIndex) {
//     try {
//       const tree = JSON.parse(cacheIndex);
//       if ((tree as TreeDirRoot).__root) {
//         await this.index({ tree: tree as TreeDirRoot });
//       }
//     } catch (_e) {
//       localStorage.removeItem(indexCacheKey);
//     }
//   } else {
//     await this.index();
//   }
//   this.onLatestIndex(() => {
//     localStorage.setItem(indexCacheKey, JSON.stringify(this.fileTree.root));
//   });
// }
