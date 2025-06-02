"use client";
import { DexieFsDb } from "@/Db/DexieFsDb";
import { DiskRecord } from "@/Db/DiskRecord";
import { ClientDb } from "@/Db/instance";
import { NamespacedFs, PatchedOPFS } from "@/Db/NamespacedFs";
import { Channel } from "@/lib/channel";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, errorCode, isErrorWithCode, NotFoundError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import { isServiceWorker } from "@/lib/isServiceWorker";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, absPath, basename, dirname, encodePath, incPath, joinPath, RelPath, relPath } from "@/lib/paths2";
import { Optional } from "@/types";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import { memfs } from "memfs";
import { FsaNodeFs } from "memfs/lib/fsa-to-node";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";
import { IReadStream } from "memfs/lib/node/types/misc";
import { nanoid } from "nanoid";
import { TreeDir, TreeDirRoot, TreeDirRootJType, TreeFile, TreeNode } from "../lib/FileTree/TreeNode";

// Utility type to make certain properties optional
export type DiskJType = { guid: string; type: DiskType };

export const DiskTypes = ["IndexedDbDisk", "MemDisk", "DexieFsDbDisk", "NullDisk", "OpFsDisk"] as const;
export type DiskType = (typeof DiskTypes)[number];

export interface CommonFileSystem {
  // [x: string]: (path: PathLike, options?: string | IReadStreamOptions | undefined) => IReadStream;
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
  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>; // Exact type can vary based on implementation details.
  readFile(path: string, options?: { encoding?: "utf8" }): Promise<Uint8Array | Buffer | string>;
  mkdir(path: string, options?: { recursive?: boolean; mode: number }): Promise<string | void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
  // rm(path: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
  writeFile(
    path: string,
    data: Uint8Array | Buffer | string,
    options?: { encoding?: "utf8"; mode: number }
  ): Promise<void>;
}

export class MutexFs implements CommonFileSystem {
  // export class MutexFs implements CommonFileSystem {
  fs: CommonFileSystem;

  constructor(fs: CommonFileSystem, protected mutex = new Mutex()) {
    this.fs = fs;
  }

  async readdir(path: string) {
    return this.mutex.runExclusive(() => this.fs.readdir(path));
  }

  async stat(path: string) {
    return this.mutex.runExclusive(() => this.fs.stat(path));
  }

  async readFile(path: string, options?: { encoding?: "utf8" }) {
    return this.mutex.runExclusive(() => this.fs.readFile(path, options));
  }

  async mkdir(path: AbsPath, options?: { recursive?: boolean; mode: number }) {
    return this.mutex.runExclusive(() => this.fs.mkdir(path, options));
  }

  async rename(oldPath: AbsPath, newPath: AbsPath) {
    return this.mutex.runExclusive(() => this.fs.rename(oldPath, newPath));
  }

  async unlink(path: AbsPath) {
    return this.mutex.runExclusive(() => this.fs.unlink(path));
  }

  async writeFile(path: AbsPath, data: Uint8Array | Buffer | string, options?: { encoding?: "utf8"; mode: number }) {
    return this.mutex.runExclusive(() => this.fs.writeFile(path, data, options));
  }
  async createReadStream(path: string): Promise<IReadStream> {
    //@ts-expect-error
    return this.fs.createReadStream(path);
  }
}

type OPFSFileSystem = CommonFileSystem & {
  rm: (path: string, options?: { force?: boolean; recursive?: boolean }) => Promise<void>;
};

export class OPFSNamespacedFs extends NamespacedFs {
  fs: OPFSFileSystem;
  constructor(fs: OPFSFileSystem, namespace: AbsPath | string) {
    super(fs, namespace);
    this.fs = fs;
  }

  tearDown(): Promise<void> {
    return this.fs.rm(encodePath(this.namespace), { recursive: true, force: true });
  }
  createReadStream(path: string): IReadStream {
    //@ts-expect-error
    return this.fs.createReadStream(encodePath(joinPath(this.namespace, path)));
  }

  rm(path: string, options?: { force?: boolean; recursive?: boolean }) {
    return this.fs.rm(encodePath(joinPath(this.namespace, path)), options);
  }
}

export class MutexOPFS extends MutexFs {
  fs: OPFSNamespacedFs;

  constructor(fs: OPFSNamespacedFs, protected mutex = new Mutex()) {
    super(fs, mutex);
    this.fs = fs;
  }

  async rm(path: string, options?: { force?: boolean; recursive?: boolean }) {
    return this.mutex.runExclusive(() => this.fs.rm(path, options));
  }

  async tearDown() {
    return this.mutex.runExclusive(() => this.fs.tearDown());
  }
}

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache: TreeDirRootJType = new TreeDirRoot().toJSON();
  static guid = () => "__disk__" + nanoid();

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
    this.oldPath = typeof oldPath === "string" ? absPath(oldPath) : oldPath;
    this.oldName = typeof oldName === "string" ? relPath(oldName) : oldName;
    this.newPath = typeof newPath === "string" ? absPath(newPath) : newPath;
    this.newName = typeof newName === "string" ? relPath(newName) : newName;
    this.type = type;
  }
  toJSON() {
    return {
      oldPath: this.oldPath,
      oldName: this.oldName,
      newPath: this.newPath,
      newName: this.newName,
      type: this.type,
    };
  }
}

export class DiskRemoteEvents extends Channel<{
  [DiskRemoteEvents.RENAME]: RemoteRenameFileType;
  [DiskRemoteEvents.INDEX]: never;
  [DiskLocalEvents.WRITE]: { filePaths: string[] };
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
  [DiskLocalEvents.WRITE]: { filePaths: string[] };
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
  mutex = new Mutex();

  constructor(public readonly guid: string, protected fs: CommonFileSystem, public fileTree: FileTree, type: DiskType) {
    super({ guid, type });
    this.remote = new DiskRemoteEvents(this.guid);
  }

  async initializeIndex() {
    try {
      await this.hydrate(); //I think this is unnecessary now that we are using the DAO
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
  latestIndexListener(
    callback: (fileTree: TreeDir) => void,
    { initialTrigger = true }: { initialTrigger?: boolean } = {}
  ) {
    if (initialTrigger && this.fileTree.initialIndex) callback(this.fileTree.root);
    return this.local.on(DiskLocalEvents.INDEX, () => {
      callback(this.fileTree.root);
      console.debug("local disk index event");
    });
  }
  async init() {
    await this.ready;
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
      this.remote.on(DiskRemoteEvents.WRITE, async ({ filePaths }) => {
        await this.local.emit(DiskLocalEvents.WRITE, { filePaths });
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

  static guid = () => "__disk__" + nanoid();

  static from({ guid, type }: { guid: string; type: DiskType }): Disk {
    return new {
      [IndexedDbDisk.type]: IndexedDbDisk,
      [MemDisk.type]: MemDisk,
      [DexieFsDbDisk.type]: DexieFsDbDisk,
      [NullDisk.type]: NullDisk,
      [OpFsDisk.type]: OpFsDisk,
    }[type](guid);
  }

  //TODO: should probabably parse document then search find image nodes
  async findReplaceImgBatch(findReplace: [string, string][]) {
    await this.ready;
    const filePaths: string[] = [];
    await this.mutex.acquire();
    await this.fileTree.asyncWalk(async (node) => {
      if (getMimeType(node.path) === "text/markdown") {
        let content = String(await this.readFile(node.path));
        let changed = false;
        for (const [find, replace] of findReplace) {
          // Inline escaping of regex special characters in 'find'
          const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`([(<])${escapedFind}`, "g");
          if (regex.test(content)) {
            content = content.replace(regex, (_match, p1) => `${p1}${replace}`);
            changed = true;
          }
        }
        if (changed) {
          await this.writeFile(node.path, content);
          filePaths.push(node.path);
        }
      }
    });
    await this.local.emit(DiskLocalEvents.WRITE, {
      filePaths,
    });
    this.mutex.release();
  }

  async mkdirRecursive(filePath: AbsPath) {
    await this.ready;
    //make recursive dir if or if not exists
    const segments = encodePath(filePath).split("/").slice(1);
    for (let i = 1; i <= segments.length; i++) {
      try {
        await this.fs.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true, mode: 0o777 });
      } catch (err) {
        if (errorCode(err).code !== "EEXIST") {
          console.error(`Error creating directory ${dirname(filePath)}:`, err);
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
    return this.local.on(DiskLocalEvents.WRITE, async ({ filePaths }) => {
      if (filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }

  async renameDir(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return this.renameDirOrFile(oldFullPath, newFullPath, "dir");
  }
  async renameFile(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return this.renameDirOrFile(oldFullPath, newFullPath, "file");
  }
  //for moving files without emitting events or updating the index
  async quietMove(oldPath: AbsPath, newPath: AbsPath) {
    const uniquePath = await this.nextPath(newPath);
    await this.mkdirRecursive(absPath(dirname(uniquePath)));
    await this.fs.rename(encodePath(oldPath), encodePath(uniquePath));
  }
  protected async renameDirOrFile(
    oldFullPath: AbsPath,
    newFullPath: AbsPath,
    type?: "file" | "dir"
  ): Promise<RenameFileType> {
    await this.ready;
    if (!type) {
      const stat = await this.fs.stat(encodePath(oldFullPath));
      type = stat.isDirectory() ? "dir" : "file";
    }
    const NOCHANGE: RenameFileType = new RenameFileType({
      type,
      newPath: oldFullPath,
      newName: relPath(basename(oldFullPath)),
      oldPath: oldFullPath,
      oldName: relPath(basename(oldFullPath)),
    });
    if (!newFullPath) return NOCHANGE;
    const cleanFullPath = joinPath(absPath(dirname(newFullPath)), basename(newFullPath));
    // .replace(/\//g, ":")

    if (cleanFullPath === oldFullPath) return NOCHANGE;

    const uniquePath = await this.nextPath(cleanFullPath); // ensure the path is unique

    try {
      await this.mkdirRecursive(absPath(dirname(uniquePath)));
      await this.fs.rename(encodePath(oldFullPath), encodePath(uniquePath));
    } catch (e) {
      throw e;
    }

    const CHANGE = new RenameFileType({
      type,
      newPath: uniquePath,
      newName: relPath(basename(uniquePath)),
      oldName: relPath(basename(oldFullPath)),
      oldPath: oldFullPath,
    });
    await this.fileTreeIndex();
    void this.remote.emit(DiskRemoteEvents.RENAME, CHANGE.toJSON());
    await this.local.emit(DiskLocalEvents.RENAME, CHANGE);
    await this.local.emit(DiskLocalEvents.INDEX);
    return CHANGE;
  }

  async newDir(fullPath: AbsPath) {
    await this.ready;
    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
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
    await this.ready;
    try {
      await this.fs.unlink(encodePath(filePath));
    } catch (err) {
      if (isErrorWithCode(err, "ENOENT")) {
        throw new NotFoundError(`File not found: ${filePath}`);
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
    const parent = selectedNode || this.fileTree.root;
    const node = this.fileTree.insertClosestNode({ type, name }, parent);
    void this.local.emit(DiskLocalEvents.INDEX);
    return node;
  }

  async nextPath(fullPath: AbsPath) {
    await this.ready;
    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    return fullPath;
  }
  async newFile(fullPath: AbsPath, content: string | Uint8Array) {
    await this.ready;

    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    await this.writeFileRecursive(fullPath, content);
    await this.fileTreeIndex();
    await this.local.emit(DiskLocalEvents.INDEX);
    await this.remote.emit(DiskRemoteEvents.UPDATE_INDEX, { filePath: fullPath, type: "file" });
    return fullPath;
  }
  async writeFileRecursive(filePath: AbsPath, content: string | Uint8Array) {
    await this.mkdirRecursive(absPath(dirname(filePath)));
    try {
      return this.fs.writeFile(encodePath(filePath), content, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }
  async pathExists(filePath: AbsPath) {
    await this.ready;
    try {
      await this.fs.stat(encodePath(filePath));
      return true;
    } catch (_e) {
      return false;
    }
  }
  createReadStream(filePath: AbsPath): IReadStream | ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> {
    // if (this.type === OpFsDisk.type) {
    if (false) {
      //@ts-expect-error
      return (this.fs.createReadStream as FsaNodeFs["createReadStream"])(encodePath(filePath), {
        encoding: "utf8",
        mode: 0o777,
      });
    } else {
      const fakeStream = new ReadableStream<Uint8Array>({
        start: (controller) => {
          void this.readFile(filePath).then((contents) => {
            controller.enqueue(coerceUint8Array(contents));
            controller.close();
          });
        },
      });
      return fakeStream.getReader();
    }
  }

  async writeFile(filePath: AbsPath, contents: string | Uint8Array) {
    await this.fs.writeFile(encodePath(filePath), contents, { encoding: "utf8", mode: 0o777 });
    await this.remote.emit(DiskRemoteEvents.WRITE, { filePaths: [filePath] });
    return;
  }
  async readFile(filePath: AbsPath) {
    await this.ready;
    try {
      return await this.fs.readFile(encodePath(filePath));
    } catch (e) {
      if (errorCode(e).code === "ENOENT") {
        throw new NotFoundError(`File not found: ${filePath}`);
      }
      throw e;
    }
  }

  async delete() {
    return ClientDb.disks.delete(this.guid);
  }
  async tearDown() {
    await this.remote.tearDown();
    await this.local.clearListeners();
  }

  get promises() {
    return this.fs;
  }
  get isIndexed() {
    return this.fileTree.initialIndex;
  }
}

export class OpFsDisk extends Disk {
  static type: DiskType = "OpFsDisk";
  ready: Promise<void>;
  private internalFs: OPFSNamespacedFs;
  constructor(public readonly guid: string) {
    const mutex = new Mutex();
    const { promise, resolve } = Promise.withResolvers<void>();
    const patchedOPFS = new PatchedOPFS(
      navigator.storage.getDirectory().then(async (dir) => {
        resolve();
        return dir;
      }) as Promise<IFileSystemDirectoryHandle>
    );

    const fs = new OPFSNamespacedFs(patchedOPFS.promises, absPath("/" + guid));

    super(guid, new MutexFs(fs, mutex), new FileTree(fs, guid, mutex), OpFsDisk.type);

    this.ready = promise;
    this.internalFs = fs;
  }

  async delete() {
    await Promise.all([this.internalFs.tearDown(), ClientDb.disks.delete(this.guid)]);
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
    const mutex = new Mutex();
    const fs = new LightningFs();
    const mutexFs = new MutexFs(fs.promises, mutex);
    const ft = new FileTree(fs.promises, guid, mutex);
    super(guid, mutexFs, ft, IndexedDbDisk.type);
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
