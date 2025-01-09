"use client";
import { FileTree, TreeDir, TreeDirRoot, TreeFile } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import { Channel } from "@/lib/channel";
import { errorCode } from "@/lib/errors";
import { absPath, AbsPath, relPath, RelPath } from "@/lib/paths";
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

// export type RenameFileType = {
//   oldPath: AbsPath;
//   oldName: RelPath;
//   newPath: AbsPath;
//   newName: RelPath;
//   type: "file" | "dir";
// };

export type RemoteRenameFileType = {
  oldPath: string;
  oldName: string;
  newPath: string;
  newName: string;
  type: "file" | "dir";
};

export class RenameFileType {
  oldPath: AbsPath;
  oldName: RelPath;
  newPath: AbsPath;
  newName: RelPath;
  type: "file" | "dir";

  constructor({
    oldPath,
    oldName,
    newPath,
    newName,
    type,
  }: {
    oldPath: string | AbsPath;
    oldName: string | RelPath;
    newPath: string | AbsPath;
    newName: string | RelPath;
    type: "file" | "dir";
  }) {
    this.oldPath = oldPath instanceof AbsPath ? oldPath : absPath(oldPath);
    this.oldName = oldName instanceof RelPath ? oldName : relPath(oldName);
    this.newPath = newPath instanceof AbsPath ? newPath : absPath(newPath);
    this.newName = newName instanceof RelPath ? newName : relPath(newName);
    this.type = type;
  }
  toJSON() {
    return {
      oldPath: this.oldPath.str,
      oldName: this.oldName.str,
      newPath: this.newPath.str,
      newName: this.newName.str,
      type: this.type,
    };
  }
}

class DiskRemoteEvents extends Channel<{
  [DiskRemoteEvents.RENAME]: RemoteRenameFileType;
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
export abstract class Disk extends DiskDAO {
  indexId: string = "";

  remote: DiskRemoteEvents;
  local = new DiskLocalEvents();

  async initializeIndex() {
    try {
      await this.index();
      await this.local.emit(DiskLocalEvents.INDEX);
    } catch (e) {
      console.warn("Error initializing index", e);
    }
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

  constructor(public readonly guid: string, public fs: FileSystem, public fileTree: FileTree, type: DiskType) {
    super({ guid, type });
    this.remote = new DiskRemoteEvents(this.guid);
  }
  init() {
    this.setupRemoteListeners();
    this.initializeIndex();
  }

  async setupRemoteListeners() {
    this.remote.init();
    this.remote.on(DiskRemoteEvents.RENAME, async (data) => {
      await this.local.emit(DiskRemoteEvents.RENAME, new RenameFileType(data));
      await this.forceIndex();
      await this.local.emit(DiskLocalEvents.INDEX);
      console.debug("remote rename", JSON.stringify(data, null, 4));
    });
    this.remote.on(DiskRemoteEvents.WRITE, async ({ filePath }) => {
      const contents = (await this.fs.promises.readFile(filePath)).toString();
      await this.local.emit(DiskLocalEvents.WRITE, { contents, filePath });
      console.debug("remote write");
    });
    this.remote.on(DiskRemoteEvents.INDEX, async () => {
      await this.forceIndex();
      this.local.emit(DiskLocalEvents.INDEX);
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

  async mkdirRecursive(filePath: AbsPath) {
    const segments = filePath.dirname().split("/").slice(1);
    for (let i = 1; i <= segments.length; i++) {
      try {
        await this.fs.promises.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true, mode: 0o777 });
      } catch (err) {
        if (errorCode(err).code !== "EEXIST") {
          console.error(`Error creating directory ${path.dirname(filePath.str)}:`, err);
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
  writeFileListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return this.local.on(DiskLocalEvents.WRITE, ({ filePath, contents }) => {
      if (watchFilePath.str === filePath) fn(contents);
    });
  }
  remoteWriteFileListener(watchFilePath: string, fn: (contents: string) => void) {
    return this.remote.on(DiskRemoteEvents.WRITE, async ({ filePath }) => {
      if (watchFilePath === filePath) {
        const contents = await this.readFile(absPath(filePath));
        return fn(contents);
      }
    });
  }

  async renameDir(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return this.renameFile(oldFullPath, newFullPath, "dir");
  }
  async renameFile(oldFullPath: AbsPath, newFullPath: AbsPath, type: "file" | "dir" = "file"): Promise<RenameFileType> {
    const NOCHANGE: RenameFileType = new RenameFileType({
      type,
      newPath: oldFullPath,
      newName: oldFullPath.basename(),
      oldPath: oldFullPath,
      oldName: oldFullPath.basename(),
    });
    if (!newFullPath) return NOCHANGE;
    const cleanFullPath = newFullPath.dirname().join(newFullPath.basename().replace(/\//g, ":"));

    if (cleanFullPath.str === oldFullPath.str) return NOCHANGE;

    try {
      await this.fs.promises.stat(cleanFullPath.str);
      return NOCHANGE;
    } catch (_e) {}

    try {
      await this.fs.promises.rename(oldFullPath.str, cleanFullPath.str);
    } catch (_e) {
      //throws an error wtf !:?!?!
    }
    await this.fileTree.forceIndex();

    const CHANGE = new RenameFileType({
      type,
      newPath: cleanFullPath,
      newName: cleanFullPath.basename(),
      oldName: oldFullPath.basename(),
      oldPath: oldFullPath,
    });

    this.remote.emit(DiskRemoteEvents.RENAME, CHANGE.toJSON());
    await this.local.emit(DiskLocalEvents.RENAME, CHANGE);
    await this.local.emit(DiskLocalEvents.INDEX);
    return CHANGE;
  }

  async addDir(fullPath: AbsPath) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    await this.mkdirRecursive(fullPath);
    await this.forceIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
    return fullPath;
  }
  async addFile(fullPath: AbsPath, content: string) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    await this.writeFileRecursive(fullPath, content);
    await this.forceIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
    return fullPath;
  }
  async writeFileRecursive(filePath: AbsPath, content: string) {
    await this.mkdirRecursive(filePath);
    try {
      this.fs.promises.writeFile(filePath.str, content, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }
  async pathExists(filePath: AbsPath) {
    try {
      await this.fs.promises.stat(filePath.str);
      return true;
    } catch (_e) {
      return false;
    }
  }
  async writeFile(filePath: AbsPath, contents: string) {
    await this.fs.promises.writeFile(filePath.str, contents, { encoding: "utf8", mode: 0o777 });
    // local messes up the editor, commenting out for now might need in the future
    // await this.local.emit(DiskLocalEvents.WRITE, { filePath, contents });
    await this.remote.emit(DiskRemoteEvents.WRITE, { filePath: filePath.str });
    return;
  }
  async readFile(filePath: AbsPath) {
    return (await this.fs.promises.readFile(filePath.str)).toString();
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
    this.local.clearListeners();
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
