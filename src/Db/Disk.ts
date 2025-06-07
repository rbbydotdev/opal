import { DexieFsDb } from "@/Db/DexieFsDb";
import { DiskRecord } from "@/Db/DiskRecord";
import { ClientDb } from "@/Db/instance";
import { MutexFs } from "@/Db/MutexFs";
import { NamespacedFs, PatchedOPFS } from "@/Db/NamespacedFs";
import { Channel } from "@/lib/channel";
import { errF, errorCode, isErrorWithCode, NotFoundError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeNodeDirJType } from "@/lib/FileTree/TreeNode";
import { isServiceWorker, isWebWorker } from "@/lib/isServiceWorker";
import { AbsPath, absPath, basename, dirname, encodePath, incPath, joinPath, RelPath, relPath } from "@/lib/paths2";
import { Optional } from "@/types";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import { memfs } from "memfs";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";
import { nanoid } from "nanoid";
import { TreeDir, TreeDirRoot, TreeDirRootJType, TreeNode } from "../lib/FileTree/TreeNode";
import { RequestSignalsInstance } from "../lib/RequestSignals";

// TODO: Lazy load modules based on disk

// Utility type to make certain properties optional
export type DiskJType = { guid: string; type: DiskType };

export const DiskTypes = [
  "IndexedDbDisk",
  "MemDisk",
  "DexieFsDbDisk",
  "NullDisk",
  "OpFsDisk",
  "ZenWebstorageFSDbDisk",
] as const;
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

  rm(path: string, options?: { force?: boolean; recursive?: boolean }) {
    return this.fs.rm(encodePath(joinPath(this.namespace, path)), options);
  }
}

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache: TreeDirRootJType;
  static guid = () => "__disk__" + nanoid();

  constructor(disk: Optional<DiskRecord, "indexCache">) {
    this.indexCache = disk.indexCache ?? new TreeDirRoot().toJSON();
    return Object.assign(this, disk);
  }

  static FromJSON(json: DiskJType) {
    return new DiskDAO(json);
  }

  toJSON({ includeIndexCache = true }: { includeIndexCache?: boolean } = {}) {
    return {
      guid: this.guid,
      type: this.type,
      ...(includeIndexCache ? { indexCache: this.indexCache } : {}),
    };
  }

  static New(type: DiskType = Disk.defaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid() });
  }

  static FromGuid(guid: string) {
    return ClientDb.disks.where("guid").equals(guid).first();
  }

  async hydrate() {
    return Object.assign(this, await DiskDAO.FromGuid(this.guid)).toModel();
  }
  update(properties: Partial<DiskRecord>) {
    return ClientDb.disks.update(this.guid, properties);
  }

  save() {
    return ClientDb.disks.put(this);
  }

  toModel() {
    return Disk.From(this);
  }
}

export class RenameFileType {
  oldPath: AbsPath;
  oldName: RelPath;
  newPath: AbsPath;
  newName: RelPath;
  fileType: "file" | "dir";

  constructor({
    oldPath,
    oldName,
    newPath,
    newName,
    fileType,
  }: {
    oldPath: string | AbsPath;
    oldName: string | RelPath;
    newPath: string | AbsPath;
    newName: string | RelPath;
    fileType: "file" | "dir";
  }) {
    this.oldPath = typeof oldPath === "string" ? absPath(oldPath) : oldPath;
    this.oldName = typeof oldName === "string" ? relPath(oldName) : oldName;
    this.newPath = typeof newPath === "string" ? absPath(newPath) : newPath;
    this.newName = typeof newName === "string" ? relPath(newName) : newName;
    this.fileType = fileType;
  }
  toJSON() {
    return {
      oldPath: this.oldPath,
      oldName: this.oldName,
      newPath: this.newPath,
      newName: this.newName,
      fileType: this.fileType,
    };
  }
}

export type RemoteRenameFileType = {
  oldPath: AbsPath;
  oldName: RelPath;
  newPath: AbsPath;
  newName: RelPath;
  fileType: "file" | "dir";
};

export type FilePathsType = {
  filePaths: string[];
};

export type CreateDetails = FilePathsType;
export type DeleteDetails = FilePathsType;
export type RenameDetails = RemoteRenameFileType;

export type IndexTrigger =
  | {
      type: "create";
      details: CreateDetails;
    }
  | {
      type: "rename";
      details: RenameDetails;
    }
  | {
      type: "delete";
      details: DeleteDetails;
    };

export type ListenerCallback<T extends "create" | "rename" | "delete"> = Parameters<Disk[`${T}Listener`]>[0];

export class DiskEventsRemote extends Channel<{
  [DiskEvents.RENAME]: RemoteRenameFileType;
  [DiskEvents.INDEX]: IndexTrigger | undefined;
  [DiskEvents.WRITE]: FilePathsType;
  [DiskEvents.CREATE]: FilePathsType;
  [DiskEvents.DELETE]: FilePathsType;
}> {}

export const DiskEvents = {
  WRITE: "write" as const,
  INDEX: "index" as const,
  RENAME: "rename" as const,
  CREATE: "create" as const,
  DELETE: "delete" as const,
};

export class DiskEventsLocal extends Emittery<{
  [DiskEvents.RENAME]: RenameFileType;
  [DiskEvents.INDEX]: IndexTrigger | undefined;
  [DiskEvents.WRITE]: FilePathsType;
  [DiskEvents.CREATE]: FilePathsType;
  [DiskEvents.DELETE]: FilePathsType;
}> {}
export abstract class Disk extends DiskDAO {
  remote: DiskEventsRemote;
  local = new DiskEventsLocal();
  ready: Promise<void> = Promise.resolve();
  mutex = new Mutex();

  constructor(public readonly guid: string, protected fs: CommonFileSystem, public fileTree: FileTree, type: DiskType) {
    super({ guid, type });
    this.remote = new DiskEventsRemote(this.guid);
  }

  async initializeIndex(cache: TreeNodeDirJType = new TreeDirRoot().toJSON()) {
    try {
      await this.fileTreeIndex({
        tree: TreeDirRoot.FromJSON(cache),
        writeIndexCache: false,
      });
      await this.local.emit(DiskEvents.INDEX, {
        type: "create",
        details: { filePaths: [] },
      });
    } catch (e) {
      throw errF`Error initializing index ${e}`;
    }
    return;
  }

  fileTreeIndex = async ({
    tree,
    writeIndexCache = true,
  }: {
    tree?: TreeDirRoot;
    writeIndexCache?: boolean;
  } = {}) => {
    const newIndex = await this.fileTree.index(tree);
    if (writeIndexCache) {
      /*await*/ void this.update({ indexCache: newIndex.toJSON() });
    }
    return newIndex;
  };

  getFirstFile() {
    for (const node of this.fileTree.iterator()) {
      if (node.isTreeFile()) return node;
    }
    return null;
  }

  tryFirstIndex() {
    return this.fileTree.tryFirstIndex();
  }

  latestIndexListener(callback: (fileTree: TreeDir, trigger?: IndexTrigger | void) => void) {
    if (this.fileTree.initialIndex) callback(this.fileTree.root);
    return this.local.on(DiskEvents.INDEX, (trigger) => {
      callback(this.fileTree.root, trigger);
      console.debug("local disk index event");
    });
  }
  async init() {
    await this.ready;
    const { indexCache } = await this.hydrate();
    await this.initializeIndex(indexCache);
    //TODO: this is a code smell, maybe make 2 workspace classes like a workerclass which does not do this
    //OR workspace has a initForWorker and init method which differentiates
    if (!isServiceWorker() || !isWebWorker()) {
      return this.setupRemoteListeners();
    } else {
      console.debug("skipping remote listeners in service worker");
    }
  }

  async setupRemoteListeners() {
    const listeners = [
      this.remote.init(),
      this.remote.on(DiskEvents.RENAME, async (data) => {
        await this.local.emit(DiskEvents.RENAME, new RenameFileType(data));
        await this.fileTreeIndex();
        await this.local.emit(DiskEvents.INDEX, {
          type: "rename",
          details: data,
        });
        console.debug("remote rename", JSON.stringify(data, null, 4));
      }),
      this.remote.on(DiskEvents.WRITE, async ({ filePaths }) => {
        await this.local.emit(DiskEvents.WRITE, { filePaths });
      }),

      this.remote.on(DiskEvents.INDEX, async (data) => {
        await this.fileTreeIndex();
        void this.local.emit(DiskEvents.INDEX, data);
      }),
    ];
    return () => listeners.forEach((p) => p());
  }

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "__disk__" + nanoid();

  static From({ guid, type, indexCache }: { guid: string; type: DiskType; indexCache?: TreeDirRootJType }): Disk {
    const DiskConstructor = {
      [IndexedDbDisk.type]: IndexedDbDisk,
      [MemDisk.type]: MemDisk,
      [DexieFsDbDisk.type]: DexieFsDbDisk,
      [NullDisk.type]: NullDisk,
      [OpFsDisk.type]: OpFsDisk,
    }[type] satisfies {
      new (guid: string, indexCache?: TreeDirRootJType): Disk; //TODO interface somewhere?
    };
    return new DiskConstructor(guid, indexCache);
  }

  async *iteratorMutex(filter?: (node: TreeNode) => boolean): AsyncIterableIterator<TreeNode> {
    await this.ready;
    await this.mutex.acquire();
    for (const node of this.fileTree.iterator(filter)) {
      yield node;
    }
    this.mutex.release();
  }

  //TODO: should probabably parse document then search find image nodes
  //Also this function is a little beefy, service object?
  //TODO use search ?
  async findReplaceImgBatch(findReplace: [string, string][]) {
    const filePaths = [];
    for await (const node of await this.iteratorMutex((node) => node.isMarkdownFile())) {
      let content = String(await this.readFile(node.path));
      let changed = false;
      for (const [find, replace] of findReplace) {
        // Match either the find string or window.location.origin + find, preceded by (< or [
        const encodedFind = encodePath(find);
        const originFind = window.location.origin + find;
        const encodedOriginFind = window.location.origin + encodedFind;

        const escapedOriginFind = originFind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const encodedEscapedOriginFind = encodedOriginFind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const encodedEscapedFind = encodedFind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const regex = new RegExp(
          `([(<])(${escapedOriginFind}|${escapedFind}|${encodedEscapedOriginFind}|${encodedEscapedFind})`,
          "g"
        );
        if (regex.test(content)) {
          content = content.replace(regex, (_match, p1, _p2) => `${p1}${encodePath(replace)}`);
          changed = true;
        }
      }
      if (changed) {
        await this.writeFile(node.path, content);
        filePaths.push(node.path);
      }
    }
    await this.local.emit(DiskEvents.WRITE, {
      filePaths,
    });
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

  async *scan() {
    const textNodes = this.fileTree.all().filter((node) => node.getMimeType().startsWith("text"));
    for (const node of textNodes) {
      yield { path: node.path, text: String(await this.readFile(node.path)) };
    }
  }

  renameListener(fn: (props: Extract<IndexTrigger, { type: "rename" }>["details"]) => void) {
    return this.local.on(DiskEvents.INDEX, (trigger) => {
      if (trigger && trigger.type === "rename") {
        fn(trigger.details);
      }
    });
  }
  deleteListener(fn: (props: Extract<IndexTrigger, { type: "delete" }>["details"]) => void) {
    return this.local.on(DiskEvents.INDEX, (trigger) => {
      if (trigger && trigger.type === "delete") {
        fn(trigger.details);
      }
    });
  }
  createListener(fn: (props: Extract<IndexTrigger, { type: "create" }>["details"]) => void) {
    return this.local.on(DiskEvents.INDEX, (trigger) => {
      if (trigger && trigger.type === "create") {
        fn(trigger.details);
      }
    });
  }

  updateListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return this.local.on(DiskEvents.WRITE, async ({ filePaths }) => {
      if (filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }

  async trash(filePath: AbsPath, type: "dir" | "file") {
    return this.renameDirOrFile(filePath, joinPath(absPath(".trash"), filePath), type);
  }
  async untrash(filePath: AbsPath, type: "dir" | "file") {
    const newPath = absPath(filePath.replace(/\.trash\//, "/")); // remove .trash prefix
    return this.renameDirOrFile(filePath, newPath, type);
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
    fileType?: "file" | "dir"
  ): Promise<RenameFileType> {
    await this.ready;
    if (!fileType) {
      const stat = await this.fs.stat(encodePath(oldFullPath));
      fileType = stat.isDirectory() ? "dir" : "file";
    }
    const NOCHANGE: RenameFileType = new RenameFileType({
      fileType: fileType,
      newPath: oldFullPath,
      newName: relPath(basename(oldFullPath)),
      oldPath: oldFullPath,
      oldName: relPath(basename(oldFullPath)),
    });

    const cleanFullPath = joinPath(absPath(dirname(newFullPath)), basename(newFullPath));
    if (!newFullPath || cleanFullPath === oldFullPath) return NOCHANGE;

    const uniquePath = await this.nextPath(cleanFullPath); // ensure the path is unique

    try {
      await this.mkdirRecursive(absPath(dirname(uniquePath)));
      await this.fs.rename(encodePath(oldFullPath), encodePath(uniquePath));
    } catch (e) {
      throw e;
    }

    const CHANGE = new RenameFileType({
      fileType,
      newPath: uniquePath,
      newName: relPath(basename(uniquePath)),
      oldName: relPath(basename(oldFullPath)),
      oldPath: oldFullPath,
    });
    await this.fileTreeIndex();
    void this.remote.emit(DiskEvents.RENAME, CHANGE);
    await this.local.emit(DiskEvents.RENAME, CHANGE);
    await this.local.emit(DiskEvents.INDEX, {
      type: "rename",
      details: CHANGE,
    });
    return CHANGE;
  }

  async newDir(fullPath: AbsPath) {
    await this.ready;
    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    await this.mkdirRecursive(fullPath);
    await this.fileTreeIndex();

    await this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });

    return fullPath;
  }
  async removeMultipleFiles(filePaths: AbsPath[]) {
    await this.ready;
    for (const filePath of filePaths) {
      await this.quietRemove(filePath);
    }
    await this.fileTreeIndex();
    await this.local.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths },
    });
  }
  private async quietRemove(filePath: AbsPath) {
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
  }
  async removeFile(filePath: AbsPath) {
    await this.quietRemove(filePath);
    await this.fileTreeIndex();
    await this.local.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths: [filePath] },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths: [filePath] },
    });
  }
  nodeFromPath(path: AbsPath) {
    return this.fileTree.nodeFromPath(path);
  }

  removeVirtualFile(path: AbsPath) {
    this.fileTree.removeNodeByPath(path);
    void this.local.emit(DiskEvents.INDEX, undefined);
  }
  addVirtualFile({ type, name }: Pick<TreeNode, "type" | "name">, selectedNode: TreeNode | null) {
    const parent = selectedNode || this.fileTree.root;
    const node = this.fileTree.insertClosestNode({ type, name }, parent);
    void this.local.emit(DiskEvents.INDEX, undefined);
    return node;
  }

  async nextPath(fullPath: AbsPath) {
    await this.ready;
    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    return fullPath;
  }
  async newFiles(files: [AbsPath, string | Uint8Array][]) {
    await this.ready;
    const result: AbsPath[] = [];
    // eslint-disable-next-line prefer-const
    for (let [fullPath, content] of files) {
      while (await this.pathExists(fullPath)) {
        fullPath = incPath(fullPath);
      }
      result.push(fullPath);
      await this.writeFileRecursive(fullPath, content);
      await this.fileTreeIndex();
    }
    await this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: result },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: result },
    });
  }

  async newFile(fullPath: AbsPath, content: string | Uint8Array) {
    await this.ready;

    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    await this.writeFileRecursive(fullPath, content);
    await this.fileTreeIndex();
    await this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });

    return fullPath;
  }
  async writeFileRecursive(filePath: AbsPath, content: string | Uint8Array) {
    await this.ready;
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

  async writeFile(filePath: AbsPath, contents: string | Uint8Array) {
    await this.fs.writeFile(encodePath(filePath), contents, { encoding: "utf8", mode: 0o777 });
    await this.remote.emit(DiskEvents.WRITE, { filePaths: [filePath] });
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

    this.internalFs = fs;
    this.ready = promise;
  }

  async delete() {
    await Promise.all([this.internalFs.tearDown(), ClientDb.disks.delete(this.guid)]);
  }
}

export class DexieFsDbDisk extends Disk {
  static type: DiskType = "DexieFsDbDisk";
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const fs = new DexieFsDb(guid);
    const mt = new Mutex();
    const ft = indexCache ? FileTree.FromJSON(indexCache, fs, guid, mt) : new FileTree(fs, guid, mt);
    super(guid, fs, ft, DexieFsDbDisk.type);
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const mutex = new Mutex();
    const fs = new LightningFs();
    const mutexFs = new MutexFs(fs.promises, mutex);
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mutex)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mutex);
    super(guid, mutexFs, ft, IndexedDbDisk.type);
    this.ready = fs.init(guid) as unknown as Promise<void>;
  }
}

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const mt = new Mutex();
    const fs = memfs().fs;
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mt)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mt);
    super(guid, fs.promises, ft, MemDisk.type);
  }
}

export class NullDisk extends Disk {
  static type: DiskType = "NullDisk";
  constructor(public readonly guid = "null", _indexCache?: TreeDirRootJType) {
    const fs = memfs().fs;
    const mt = new Mutex();
    const ft = new FileTree(fs.promises, guid, mt);
    super("null", fs.promises, ft, NullDisk.type);
  }
}
