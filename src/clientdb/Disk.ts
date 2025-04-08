"use client";
import { DexieFsDb } from "@/clientdb/DexieFsDb";
import { FileTree, TreeDir, TreeDirRoot, TreeFile, TreeNode } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import { Channel } from "@/lib/channel";
import { ConflictError, errorCode, isErrorWithCode, NotFoundError } from "@/lib/errors";
import { getEtagSync } from "@/lib/getEtag";
import { absPath, AbsPath, relPath, RelPath } from "@/lib/paths";
import LightningFs from "@isomorphic-git/lightning-fs";
import Emittery from "emittery";
import { memfs } from "memfs";
import { nanoid } from "nanoid";
import path from "path";
export type DiskJType = { guid: string; type: DiskType; fs: Record<string, string> };

export type DiskType = "IndexedDbDisk" | "MemDisk" | "DexieFsDbDisk";

interface CommonFileSystem {
  readdir(path: string): Promise<
    (
      | string
      | Buffer<ArrayBufferLike>
      | {
          name: string | Buffer<ArrayBufferLike>;
          isDirectory: () => boolean;
          isFile: () => boolean;
        }
    )[]
  >;
  stat(path: string): Promise<{ isDirectory: () => boolean }>; // Exact type can vary based on implementation details.
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string>;
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void>;
}

// export type FileSystem = InstanceType<typeof LightningFs>["promises"] | ReturnType<typeof memfs>["fs"]["promises"];

export type FileSystem = CommonFileSystem;

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
      await this.index({
        visitor: async (node) => {
          // console.log(node);
          if (node.mimeType?.startsWith("image/")) {
            const fileContent = await this.readFile(node.path);
            node.eTag = getEtagSync(Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent));
          }
          return node;
        },
      });
      await this.local.emit(DiskLocalEvents.INDEX);
    } catch (e) {
      console.warn("Error initializing index", e);
    }
    return;
  }

  forceIndex = () => {
    return this.fileTree.index();
  };

  getFirstFile(): TreeFile | null {
    let first = null;
    this.fileTree.root.walk((file, _, exit) => {
      if (file.type === "file" && !file.isVirtual) {
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

  awaitFirstIndex() {
    return new Promise((rs) =>
      this.initialIndexListener((fileTreeDir: TreeDir) => {
        rs(fileTreeDir);
      })
    );
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
  async init() {
    return Promise.all([this.setupRemoteListeners(), this.initializeIndex()]);
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
      const contents = (await this.fs.readFile(filePath)).toString();
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
    return new {
      [IndexedDbDisk.type]: IndexedDbDisk,
      [MemDisk.type]: MemDisk,
      [DexieFsDbDisk.type]: DexieFsDbDisk,
    }[type](guid);
  }

  static from({ guid, type }: { guid: string; type: DiskType }): Disk {
    return new {
      [IndexedDbDisk.type]: IndexedDbDisk,
      [MemDisk.type]: MemDisk,
      [DexieFsDbDisk.type]: DexieFsDbDisk,
    }[type](guid);
  }

  async mkdirRecursive(filePath: AbsPath) {
    const segments = filePath.split("/").slice(1);
    for (let i = 1; i <= segments.length; i++) {
      try {
        // await this.fs.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true });
        await this.fs.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true, mode: 0o777 });
      } catch (err) {
        if (errorCode(err).code !== "EEXIST") {
          console.error(`Error creating directory ${path.dirname(filePath.str)}:`, err);
        }
      }
    }
  }
  async index({
    tree,
    visitor,
  }: { tree?: TreeDirRoot; visitor?: (node: TreeNode) => Promise<TreeNode> | TreeNode } = {}) {
    if (!this.fileTree.initialIndex) {
      await this.fileTree.index({ tree, visitor });
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
        try {
          const contents = await this.readFile(absPath(filePath));
          return fn(contents.toString());
        } catch (e) {
          if (errorCode(e).code === "ENOENT") {
            throw new NotFoundError(`File not found: ${filePath}`);
          }
          throw e;
        }
      }
    });
  }

  async renameDir(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return this.renameDirFile(oldFullPath, newFullPath, "dir");
  }
  async renameDirFile(
    oldFullPath: AbsPath,
    newFullPath: AbsPath,
    type: "file" | "dir" = "file"
  ): Promise<RenameFileType> {
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

    if (await this.pathExists(cleanFullPath)) {
      throw new ConflictError().hint(`File already exists: ${cleanFullPath}`);
    }

    try {
      await this.fs.rename(oldFullPath.str, cleanFullPath.str);
    } catch (e) {
      throw e;
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

  async newDir(fullPath: AbsPath) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    await this.mkdirRecursive(fullPath);
    await this.forceIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
    return fullPath;
  }
  async removeFile(filePath: AbsPath) {
    try {
      await this.fs.unlink(filePath.str);
    } catch (err) {
      if (isErrorWithCode(err, "ENOENT")) {
        throw new NotFoundError(`File not found: ${filePath}`);
      } else {
        throw err;
      }
    }
    await this.fileTree.forceIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
  }
  nodeFromPath(path: AbsPath) {
    return this.fileTree.nodeFromPath(path);
  }

  removeVirtualFile(path: AbsPath) {
    this.fileTree.removeNodeByPath(path);
    this.local.emit(DiskLocalEvents.INDEX);
  }
  addVirtualFile({ type, name }: Pick<TreeNode, "type" | "name">, selectedNode: TreeNode | null) {
    const node = this.fileTree.insertClosestNode({ type, name }, selectedNode || this.fileTree.root);
    this.local.emit(DiskLocalEvents.INDEX);
    return node;
  }
  async newFile(fullPath: AbsPath, content: string | Uint8Array) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    await this.writeFileRecursive(fullPath, content);
    await this.forceIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
    return fullPath;
  }
  async writeFileRecursive(filePath: AbsPath, content: string | Uint8Array) {
    await this.mkdirRecursive(filePath.dirname());
    try {
      this.fs.writeFile(filePath.str, content, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }
  async pathExists(filePath: AbsPath) {
    try {
      await this.fs.stat(filePath.str);
      return true;
    } catch (_e) {
      return false;
    }
  }
  async writeFile(filePath: AbsPath, contents: string | Uint8Array) {
    await this.fs.writeFile(filePath.str, contents, { encoding: "utf8", mode: 0o777 });
    // local messes up the editor, commenting out for now might need in the future
    // await this.local.emit(DiskLocalEvents.WRITE, { filePath, contents });
    await this.remote.emit(DiskRemoteEvents.WRITE, { filePath: filePath.str });
    return;
  }
  async readFile(filePath: AbsPath) {
    try {
      return await this.fs.readFile(filePath.str);
    } catch (e) {
      if (errorCode(e).code === "ENOENT") {
        throw new NotFoundError(`File not found: ${filePath}`);
      }
      throw e;
    }
  }

  toJSON() {
    return { guid: this.guid, type: this.type } as DiskRecord;
  }

  teardown() {
    this.remote.tearDown();
    this.local.clearListeners();
  }

  get promises() {
    return this.fs;
  }
  get isIndexed() {
    return this.fileTree.initialIndex;
  }
}

export class DexieFsDbDisk extends Disk {
  static type: DiskType = "DexieFsDbDisk";
  constructor(public readonly guid: string) {
    const fs = new DexieFsDb(guid);
    super(guid, fs, new FileTree(fs), DexieFsDbDisk.type);
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  ready: Promise<void>;
  constructor(public readonly guid: string) {
    const fs = new LightningFs();
    super(guid, fs.promises, new FileTree(fs.promises), IndexedDbDisk.type);
    this.ready = fs.init(guid) as unknown as Promise<void>;
  }
}

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  constructor(public readonly guid: string) {
    const fs = memfs().fs;
    super(guid, fs.promises, new FileTree(fs.promises), MemDisk.type);
  }
}
