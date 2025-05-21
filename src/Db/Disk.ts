"use client";
import { DexieFsDb } from "@/Db/DexieFsDb";
import { DiskRecord } from "@/Db/DiskRecord";
import { ClientDb } from "@/Db/instance";
import { Channel } from "@/lib/channel";
import { errF, errorCode, isErrorWithCode, NotFoundError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import { isServiceWorker } from "@/lib/isServiceWorker";
import { getMimeType } from "@/lib/mimeType";
import { absPath, AbsPath, relPath, RelPath } from "@/lib/paths";
import { Optional } from "@/types";
import LightningFs from "@isomorphic-git/lightning-fs";
import Emittery from "emittery";
import { memfs } from "memfs";
import { nanoid } from "nanoid";
import path from "path";
import { TreeDir, TreeDirRoot, TreeDirRootJType, TreeFile, TreeNode } from "../lib/FileTree/TreeNode";

// Utility type to make certain properties optional
export type DiskJType = { guid: string; type: DiskType };

export const DiskTypes = ["IndexedDbDisk", "MemDisk", "DexieFsDbDisk", "NullDisk"] as const;
export type DiskType = (typeof DiskTypes)[number];

export interface CommonFileSystem {
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

export type FileSystem = CommonFileSystem;

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache: TreeDirRootJType = new TreeDirRoot().toJSON();
  static guid = () => "disk:" + nanoid();

  constructor(disk: Optional<DiskRecord, "indexCache">) {
    return Object.assign(this, disk);
  }

  static fromJSON(json: DiskJType) {
    return new DiskDAO(json);
  }

  toJSON({ includeIndexCache = false }: { includeIndexCache?: boolean } = {}) {
    return {
      guid: this.guid,
      type: this.type,
      ...(includeIndexCache ? { indexCache: this.indexCache } : {}),
    };
  }

  static new(type: DiskType = Disk.defaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid() });
  }

  static getByGuid(guid: string) {
    return ClientDb.disks.where("guid").equals(guid).first();
  }

  async hydrate() {
    return Object.assign(this, await DiskDAO.getByGuid(this.guid)).toModel();
  }
  update(properties: Partial<DiskRecord>) {
    return ClientDb.disks.update(this.guid, properties);
  }

  save() {
    return ClientDb.disks.put(this);
  }

  toModel() {
    return Disk.from(this);
  }
}

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
/*

  DISK LOCAL EVENTS ARE NOT TO BE USED TO TRIGGER WRITES,INDEXES ETC
  INSTEAD THEY ARE SIGNALS THAT THESE THINGS HAVE TAKEN PLACE
  NEVER USE THEM TO TRIGGER 'WORK' RATHER SIGNALS THAT WORK HAS BEEN DONE

  FOR NOW; DISK REMOTE EVENTS, SIGNAL THAT WORK MAY NEED TO BE DONE, THIS COULD CHANGE,
  REMOTE SIGNAL COULD TELL REMOTE TO LOOK AT STORAGE CACHES AGAIN AS THEY SHOULD BE UPDATED

*/
export class DiskRemoteEvents extends Channel<{
  [DiskRemoteEvents.RENAME]: RemoteRenameFileType;
  [DiskRemoteEvents.INDEX]: never;
  [DiskLocalEvents.WRITE]: { filePath: string };
  [DiskRemoteEvents.UPDATE_INDEX]: { filePath: string; type: "file" | "dir" };
}> {
  static WRITE = "write" as const;
  static INDEX = "index" as const;
  static RENAME = "rename" as const;
  static UPDATE_INDEX = "updateIndex" as const;
}

export class DiskLocalEvents extends Emittery<{
  [DiskLocalEvents.RENAME]: RenameFileType;
  [DiskLocalEvents.INDEX]: never;
  [DiskLocalEvents.WRITE]: { filePath: string };
  [DiskRemoteEvents.UPDATE_INDEX]: { filePath: string; type: "file" | "dir" };
}> {
  static WRITE = "write" as const;
  static INDEX = "index" as const;
  static RENAME = "rename" as const;
  static UPDATE_INDEX = "updateIndex" as const;
}
export abstract class Disk extends DiskDAO {
  remote: DiskRemoteEvents;
  local = new DiskLocalEvents();
  ready: Promise<void> = Promise.resolve();

  constructor(public readonly guid: string, public fs: FileSystem, public fileTree: FileTree, type: DiskType) {
    super({ guid, type });
    this.remote = new DiskRemoteEvents(this.guid);
  }

  async initializeIndex() {
    try {
      await this.hydrate(); //TODO: this should go from DAO to Disk may need to re-work workspace to do so as well
      await this.firstIndex();
      await this.local.emit(DiskLocalEvents.INDEX);
    } catch (e) {
      throw errF`Error initializing index ${e}`;
    }
    return;
  }

  updateIndex(path: AbsPath, type: "file" | "dir", writeIndexCache = true) {
    this.fileTree.updateIndex(path, type);
    if (writeIndexCache) {
      /*await*/ void this.update({ indexCache: this.fileTree.root.toJSON() });
    }
  }

  fileTreeIndex = async ({
    tree,
    visitor,
    writeIndexCache = true,
  }: {
    tree?: TreeDirRoot;
    visitor?: (node: TreeNode) => Promise<TreeNode> | TreeNode;
    writeIndexCache?: boolean;
  } = {}) => {
    const newIndex = await this.fileTree.index({ tree, visitor });
    if (writeIndexCache) {
      /*await*/ void this.update({ indexCache: newIndex.toJSON() });
    }
    return newIndex;
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
      void this.local.once(DiskLocalEvents.INDEX).then(() => {
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
      // return this.local.on([DiskLocalEvents.INDEX, DiskLocalEvents.UPDATE_INDEX], () => {
      callback(this.fileTree.root);
      console.debug("local disk index event");
    });
  }
  // static INIT_LISTENERS = true;
  // static NO_INIT_LISTENERS = false;

  // async init(setupListeners = Disk.INIT_LISTENERS) {
  async init() {
    await this.initializeIndex();
    if (!isServiceWorker()) {
      return this.setupRemoteListeners();
    } else {
      console.debug("skipping remote listeners in service worker");
    }
  }

  async setupRemoteListeners() {
    const listeners = [
      this.remote.init(),
      this.remote.on(DiskRemoteEvents.RENAME, async (data) => {
        await this.local.emit(DiskRemoteEvents.RENAME, new RenameFileType(data));
        await this.fileTreeIndex();
        await this.local.emit(DiskLocalEvents.INDEX);
        console.debug("remote rename", JSON.stringify(data, null, 4));
      }),
      this.remote.on(DiskRemoteEvents.WRITE, async ({ filePath }) => {
        await this.local.emit(DiskLocalEvents.WRITE, { filePath });
      }),

      this.remote.on(DiskRemoteEvents.INDEX, async () => {
        await this.fileTreeIndex();
        void this.local.emit(DiskLocalEvents.INDEX);
      }),

      this.remote.on(DiskRemoteEvents.UPDATE_INDEX, async ({ filePath, type }) => {
        this.updateIndex(absPath(filePath), type);
        void this.local.emit(DiskLocalEvents.INDEX);
      }),
    ];
    return () => listeners.forEach((p) => p());
  }

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "disk:" + nanoid();

  // static fromURI(uriStr: string) {
  //   const [type, ...guid] = uriStr.split("@");
  //   if (!DiskTypes.includes(type as DiskType)) {
  //     throw new Error(`Invalid disk type: ${type}`);
  //   }
  //   return Disk.from({ guid: guid.join("@"), type: type as DiskType });
  // }
  // toURI() {
  //   return `${this.type}@${this.guid}`;
  // }
  static from({ guid, type }: { guid: string; type: DiskType }): Disk {
    return new {
      [IndexedDbDisk.type]: IndexedDbDisk,
      [MemDisk.type]: MemDisk,
      [DexieFsDbDisk.type]: DexieFsDbDisk,
      [NullDisk.type]: NullDisk,
    }[type](guid);
  }

  //TODO: doesnt work with multiple files
  async findReplace(find: string, replace: string) {
    return this.fileTree.walk(async (node) => {
      if (getMimeType(node.path) === "text/markdown") {
        const content = String(await this.readFile(node.path));
        if (content.includes(find)) {
          const newContent = content.replaceAll(find, replace);
          await this.writeFile(node.path, newContent);
          await this.local.emit(DiskLocalEvents.WRITE, {
            filePath: node.path.str,
          });
        }
      }
    });
  }

  async mkdirRecursive(filePath: AbsPath) {
    //make recursive dir if or if not exists
    const segments = filePath.encode().split("/").slice(1);
    for (let i = 1; i <= segments.length; i++) {
      try {
        await this.fs.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true, mode: 0o777 });
      } catch (err) {
        if (errorCode(err).code !== "EEXIST") {
          console.error(`Error creating directory ${path.dirname(filePath.str)}:`, err);
        }
      }
    }
  }
  async firstIndex() {
    if (!this.fileTree.initialIndex) {
      if (!this.indexCache) await this.hydrate(); //defensive check should already be present - TODO should be going from DAO.hydrate to Disk
      return this.fileTreeIndex({ tree: TreeDirRoot.fromJSON(this.indexCache), writeIndexCache: false });
    } else {
      console.debug("disk index skipped");
      return this.fileTree.root;
    }
  }

  renameListener(fn: (props: RenameFileType) => void) {
    return this.local.on(DiskLocalEvents.RENAME, fn);
  }
  writeFileListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return this.local.on(DiskLocalEvents.WRITE, async ({ filePath }) => {
      if (watchFilePath.str === filePath) {
        fn(String(await this.readFile(absPath(filePath))));
      }
    });
  }

  async renameDir(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return this.renameDirOrFile(oldFullPath, newFullPath, "dir");
  }
  async renameDirOrFile(
    oldFullPath: AbsPath,
    newFullPath: AbsPath,
    //type can be determined by the fs.stat no?
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
    let cleanFullPath = newFullPath.dirname().join(newFullPath.basename().replace(/\//g, ":"));

    if (cleanFullPath.str === oldFullPath.str) return NOCHANGE;

    while (await this.pathExists(cleanFullPath)) {
      cleanFullPath = cleanFullPath.inc();
    }

    try {
      await this.mkdirRecursive(cleanFullPath.dirname());
      await this.fs.rename(oldFullPath.encode(), cleanFullPath.encode());
    } catch (e) {
      throw e;
    }
    await this.fileTreeIndex();

    const CHANGE = new RenameFileType({
      type,
      newPath: cleanFullPath,
      newName: cleanFullPath.basename(),
      oldName: oldFullPath.basename(),
      oldPath: oldFullPath,
    });

    void this.remote.emit(DiskRemoteEvents.RENAME, CHANGE.toJSON());
    await this.local.emit(DiskLocalEvents.RENAME, CHANGE);
    await this.local.emit(DiskLocalEvents.INDEX);
    return CHANGE;
  }

  async newDir(fullPath: AbsPath) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    await this.mkdirRecursive(fullPath);
    await this.fileTreeIndex();
    // this.updateIndex(fullPath, "dir");
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
    // await this.local.emit(DiskLocalEvents.UPDATE_INDEX, { filePath: fullPath.str, type: "dir" });
    // await this.remote.emit(DiskLocalEvents.UPDATE_INDEX, { filePath: fullPath.str, type: "dir" });
    return fullPath;
  }
  async removeFile(filePath: AbsPath) {
    try {
      await this.fs.unlink(filePath.encode());
    } catch (err) {
      if (isErrorWithCode(err, "ENOENT")) {
        throw new NotFoundError().hint(`File not found: ${filePath}`);
      } else {
        throw err;
      }
    }
    await this.fileTreeIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskLocalEvents.INDEX);
  }
  nodeFromPath(path: AbsPath) {
    return this.fileTree.nodeFromPath(path);
  }

  removeVirtualFile(path: AbsPath) {
    this.fileTree.removeNodeByPath(path);
    void this.local.emit(DiskLocalEvents.INDEX);
  }
  addVirtualFile({ type, name }: Pick<TreeNode, "type" | "name">, selectedNode: TreeNode | null) {
    const node = this.fileTree.insertClosestNode({ type, name }, selectedNode || this.fileTree.root);
    void this.local.emit(DiskLocalEvents.INDEX);
    return node;
  }

  async nextPath(fullPath: AbsPath) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    return fullPath;
  }
  async newFile(fullPath: AbsPath, content: string | Uint8Array) {
    while (await this.pathExists(fullPath)) {
      fullPath = fullPath.inc();
    }
    await this.writeFileRecursive(fullPath, content);
    await this.fileTreeIndex();
    // this.updateIndex(fullPath, "file");
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskRemoteEvents.UPDATE_INDEX, { filePath: fullPath.str, type: "file" });
    return fullPath;
  }
  async writeFileRecursive(filePath: AbsPath, content: string | Uint8Array) {
    await this.mkdirRecursive(filePath.dirname());
    try {
      return this.fs.writeFile(filePath.encode(), content, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }
  async pathExists(filePath: AbsPath) {
    try {
      await this.fs.stat(filePath.encode());
      return true;
    } catch (_e) {
      return false;
    }
  }
  async writeFile(filePath: AbsPath, contents: string | Uint8Array) {
    await this.fs.writeFile(filePath.encode(), contents, { encoding: "utf8", mode: 0o777 });
    await this.remote.emit(DiskRemoteEvents.WRITE, { filePath: filePath.str });
    return;
  }
  async readFile(filePath: AbsPath) {
    try {
      return await this.fs.readFile(filePath.encode());
    } catch (e) {
      if (errorCode(e).code === "ENOENT") {
        throw new NotFoundError().hint(`File not found: ${filePath}`);
      }
      throw e;
    }
  }

  delete() {
    // void this.fileTree.clearCache();
    // throw new Error("Not implemented");
    return ClientDb.disks.delete(this.guid);
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
    const ft = new FileTree(fs, guid);
    super(guid, fs, ft, DexieFsDbDisk.type);
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  constructor(public readonly guid: string) {
    const fs = new LightningFs();
    const ft = new FileTree(fs.promises, guid);
    super(guid, fs.promises, ft, IndexedDbDisk.type);
    this.ready = fs.init(guid) as unknown as Promise<void>;
  }
}

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  constructor(public readonly guid: string) {
    const fs = memfs().fs;
    const ft = new FileTree(fs.promises, guid);
    super(guid, fs.promises, ft, MemDisk.type);
  }
}

export class NullDisk extends Disk {
  static type: DiskType = "NullDisk";
  constructor() {
    const fs = memfs().fs;
    const ft = new FileTree(fs.promises, "null");
    super("null", fs.promises, ft, NullDisk.type);
  }
}
