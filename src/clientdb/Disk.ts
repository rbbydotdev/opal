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

export type FileSystem = InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

export class DiskRecord {
  guid!: string;
  type!: DiskType;
  // indexId!: string;
}

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  // indexId!: string;
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

  async hydrate() {
    return Object.assign(this, await DiskDAO.getByGuid(this.guid));
  }

  update() {
    return ClientDb.disks.update(this.guid, this);
  }

  save() {
    return ClientDb.disks.put(this);
  }

  toModel() {
    return Disk.from(this);
  }
}

export type RenameFileType = { oldPath: string; oldName: string; newPath: string; newName: string };

class DiskRemoteEvents extends Channel<{
  [DiskRemoteEvents.RENAME]: RenameFileType;
  [DiskRemoteEvents.INDEX]: never;
  [DiskLocalEvents.WRITE]: { filePath: string };
}> {
  static WRITE = "write" as const;
  static INDEX = "index" as const;
  static RENAME = "rename" as const;
}

class DiskLocalEvents extends Emittery<{
  [DiskLocalEvents.RENAME]: RenameFileType;
  [DiskLocalEvents.INDEX]: never;
  [DiskLocalEvents.WRITE]: { filePath: string; contents: string };
}> {
  static WRITE = "write" as const;
  static INDEX = "index" as const;
  static RENAME = "rename" as const;
}

// export abstract class Disk implements DiskRecord {
export abstract class Disk extends DiskDAO {
  // export abstract class Disk implements DiskRecord {
  indexId: string = "";
  // static REMOTE_INDEX = "remoteindex";

  remote: DiskRemoteEvents;
  local = new DiskLocalEvents();

  async initializeIndex() {
    await this.index();
    await this.local.emit(DiskLocalEvents.INDEX);
    return;
  }

  forceIndex = () => {
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

  initialIndexListener(callback: (fileTreeDir: TreeDir) => void) {
    if (this.fileTree.initialIndex) {
      callback(this.fileTree.getRootTree());
    } else {
      this.local.once(DiskLocalEvents.INDEX).then(() => {
        callback(this.fileTree.getRootTree());
      });
    }
  }

  //race will call callback if there is already a fresh initialized index
  latestIndexListener(callback: (fileTree: TreeDir) => void) {
    if (this.fileTree.initialIndex) callback(this.fileTree.root);
    return this.local.on(DiskLocalEvents.INDEX, () => {
      callback(this.fileTree.root);
      console.debug("disk index");
    });
  }

  fileWriteListener(callback: () => void) {
    return this.local.on(DiskLocalEvents.WRITE, callback);
  }
  // remoteFileWriteListener(callback: () => void) {
  //   return this.remote.on(DiskRemoteEvents.WRITE, () => {});
  // }

  constructor(public readonly guid: string, public fs: FileSystem, public fileTree: FileTree, type: DiskType) {
    super({ guid, type });
    this.remote = new DiskRemoteEvents(this.guid);
  }
  async init() {
    console.debug("disk init");
    this.setupRemoteListeners();
    await this.initializeIndex();
    return this;
  }

  async setupRemoteListeners() {
    this.remote.on(DiskRemoteEvents.RENAME, async (data) => {
      await this.local.emit(DiskRemoteEvents.RENAME, data);
      await this.forceIndex();
      this.local.emit(DiskLocalEvents.INDEX);
      console.debug("remote rename", JSON.stringify(data, null, 4));
    });
    this.remote.on(DiskRemoteEvents.WRITE, async ({ filePath }) => {
      const contents = (await this.fs.promises.readFile(filePath)).toString();
      this.local.emit(DiskLocalEvents.WRITE, { contents, filePath });
      console.debug("remote write");
    });
  }

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: DiskType = Disk.defaultDiskType) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }

  static from({ guid, type }: { guid: string; type: DiskType }): Disk {
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
    if (result !== FileTree.SKIPPED) {
      console.debug("disk index complete");
    } else {
      console.debug("disk index skipped");
    }
  }

  renameListener(fn: (props: RenameFileType) => void) {
    return this.local.on(DiskLocalEvents.RENAME, fn);
  }
  writeFileListener(watchFilePath: string, fn: (contents: string) => void) {
    return this.local.on(DiskLocalEvents.WRITE, ({ filePath, contents }) => {
      if (watchFilePath === filePath) fn(contents);
    });
  }
  remoteWriteFileListener(watchFilePath: string, fn: (contents: string) => void) {
    return this.remote.on(DiskRemoteEvents.WRITE, async ({ filePath }) => {
      if (watchFilePath === filePath) {
        const contents = await this.readFile(filePath);
        return fn(contents);
      }
    });
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
    await this.fileTree.forceIndex();

    const CHANGE: RenameFileType = {
      newPath: fullPath,
      newName: path.basename(fullPath),
      oldName: path.basename(oldPath),
      oldPath,
    };

    await this.remote.emit(DiskRemoteEvents.RENAME, CHANGE);
    await this.local.emit(DiskLocalEvents.RENAME, CHANGE);
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
  async writeFile(filePath: string, contents: string) {
    await this.fs.promises.writeFile(filePath, contents, { encoding: "utf8", mode: 0o777 });
    // local messes up the editor, commenting out for now might need in the future
    // await this.local.emit(DiskLocalEvents.WRITE, { filePath, contents });
    await this.remote.emit(DiskRemoteEvents.WRITE, { filePath });
    return;
  }
  async readFile(filePath: string) {
    return (await this.fs.promises.readFile(filePath)).toString();
  }

  async withFs(fn: (fs: FileSystem) => Promise<unknown> | unknown) {
    await fn(this.fs);
    await this.fileTree.forceIndex();
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
  constructor(public readonly guid: string, public readonly db = ClientDb) {
    const fs = new LightningFs();
    fs.init(guid);
    super(guid, fs, new FileTree(fs), IndexedDbDisk.type);
  }
}

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  constructor(public readonly guid: string, public readonly db = ClientDb) {
    const fs = memfs().fs;
    super(guid, fs, new FileTree(fs), MemDisk.type);
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
