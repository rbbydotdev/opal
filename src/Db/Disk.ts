import { CommonFileSystem, OPFSNamespacedFs } from "@/Db/CommonFileSystem";
import { DexieFsDb } from "@/Db/DexieFsDb";
import { DiskDAO } from "@/Db/DiskDAO";
import { ClientDb } from "@/Db/instance";
import { MutexFs } from "@/Db/MutexFs";
import { PatchedOPFS } from "@/Db/NamespacedFs";
import { UnwrapScannable } from "@/features/search/SearchScannable";
import { Channel } from "@/lib/channel";
import { errF, errorCode, isErrorWithCode, NotFoundError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRoot, TreeNodeDirJType, VirtualDupTreeNode } from "@/lib/FileTree/TreeNode";
import { isServiceWorker, isWebWorker } from "@/lib/isServiceWorker";
import { AbsPath, absPath, basename, dirname, encodePath, incPath, joinPath, RelPath, relPath } from "@/lib/paths2";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import { memfs } from "memfs";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";
import { nanoid } from "nanoid";
import { TreeDir, TreeDirRootJType, TreeNode } from "../lib/FileTree/TreeNode";
import { reduceLineage } from "../lib/paths2";
import { RequestSignalsInstance } from "../lib/RequestSignals";

// TODO: Lazy load modules based on disk

// Utility type to make certain properties optional
export type DiskJType = { guid: string; type: DiskType; indexCache?: TreeDirRootJType | null };

export const DiskTypes = [
  "IndexedDbDisk",
  "MemDisk",
  "DexieFsDbDisk",
  "NullDisk",
  "OpFsDisk",
  "ZenWebstorageFSDbDisk",
] as const;
export type DiskType = (typeof DiskTypes)[number];

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
  static New(properties: RemoteRenameFileType): RenameFileType {
    return new RenameFileType(properties);
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
  filePaths: AbsPath[];
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
      details: RenameDetails[];
    }
  | {
      type: "delete";
      details: DeleteDetails;
    };

export type ListenerCallback<T extends "create" | "rename" | "delete"> = Parameters<Disk[`${T}Listener`]>[0];

export type DiskRemoteEventPayload = {
  [DiskEvents.RENAME]: RemoteRenameFileType[];
  [DiskEvents.INDEX]: IndexTrigger | undefined;
  [DiskEvents.WRITE]: FilePathsType;
  [DiskEvents.CREATE]: FilePathsType;
  [DiskEvents.DELETE]: FilePathsType;
};
export class DiskEventsRemote extends Channel<DiskRemoteEventPayload> {}

export const SIGNAL_ONLY = undefined;
export const DiskEvents = {
  WRITE: "write" as const,
  INDEX: "index" as const,
  RENAME: "rename" as const,
  CREATE: "create" as const,
  DELETE: "delete" as const,
};

type DiskLocalEventPayload = {
  [DiskEvents.RENAME]: RenameFileType[];
  [DiskEvents.INDEX]: IndexTrigger | undefined;
  [DiskEvents.WRITE]: FilePathsType;
  [DiskEvents.CREATE]: FilePathsType;
  [DiskEvents.DELETE]: FilePathsType;
};
export class DiskEventsLocal extends Emittery<DiskLocalEventPayload> {}

// export type DiskScanTextSearchResultType = { path: AbsPath; text: string };

export type DiskScanResult = UnwrapScannable<Disk>;

/*

TODO add mount dirs to disk

Give disk a mount map 

mounts = Record<AbsPath, Disk>


*/
export abstract class Disk {
  remote: DiskEventsRemote;
  local = new DiskEventsLocal(); //oops this should be put it init but i think it will break everything
  ready: Promise<void> = Promise.resolve();
  mutex = new Mutex();

  abstract type: DiskType;

  constructor(
    public readonly guid: string,
    protected fs: CommonFileSystem,
    public fileTree: FileTree,
    private connector: DiskDAO
  ) {
    this.remote = new DiskEventsRemote(this.guid); //oops this should probably go in remote
  }

  static FromJSON(json: DiskJType): Disk {
    return Disk.From({ guid: json.guid, type: json.type, indexCache: json.indexCache });
  }

  initialIndexFromCache(cache: TreeNodeDirJType) {
    this.fileTree.forceIndex(cache);
    void this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
    return;
  }
  async hydrateIndexFromDisk() {
    try {
      await this.fileTreeIndex({
        writeIndexCache: false,
      });
      await this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
    } catch (e) {
      throw errF`Error initializing index ${e}`;
    }
    return;
  }

  toJSON() {
    return {
      guid: this.guid,
      type: this.type,
      indexCache: this.connector.indexCache,
    };
  }

  fileTreeIndex = async ({
    writeIndexCache = true,
  }: {
    writeIndexCache?: boolean;
  } = {}) => {
    const newIndex = await this.fileTree.index();
    this.connector.updateIndexCache(newIndex);
    if (writeIndexCache) {
      /*await*/ void this.connector.save();
    }
    return newIndex;
  };

  getFirstFile() {
    for (const node of this.fileTree.iterator((node) => !node.isHidden())) {
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
  async init({ skipListeners }: { skipListeners?: boolean } = {}) {
    await this.ready;
    const { indexCache } = await this.connector.hydrate();
    this.initialIndexFromCache(indexCache ?? new TreeDirRoot()); //load first from cache
    void this.hydrateIndexFromDisk(); //load first from cache
    if (isServiceWorker() || isWebWorker() || skipListeners) {
      console.debug("skipping remote listeners in service worker");
    } else {
      return this.setupRemoteListeners();
    }
  }

  broadcastRemote<T extends (typeof DiskEvents)[keyof typeof DiskEvents]>(
    eventName: T,
    eventData?: DiskRemoteEventPayload[T],
    options?: { contextId?: string }
  ): Promise<void> {
    return Disk.BroadcastRemote(this.guid, eventName, eventData, options);
  }

  static BroadcastRemote<T extends (typeof DiskEvents)[keyof typeof DiskEvents]>(
    diskId: string,
    eventName: T,
    eventData?: DiskRemoteEventPayload[T],
    { contextId }: { contextId?: string } = { contextId: nanoid() }
  ) {
    const channel = Channel.GetChannel(diskId) as DiskEventsRemote | undefined;
    if (!channel) {
      console.warn("No channel found for diskId:", diskId);
      return Promise.resolve();
    }
    return channel.emit(eventName, eventData, { contextId });
  }

  async setupRemoteListeners() {
    const listeners = [
      this.remote.init(),
      this.remote.on(DiskEvents.RENAME, async (data) => {
        await this.local.emit(DiskEvents.RENAME, data.map(RenameFileType.New));
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

      // this.remote.on(DiskEvents.INDEX, async (data) => {
      //   await this.fileTreeIndex();
      //   void this.local.emit(DiskEvents.INDEX, data);
      // }),
    ];
    return () => listeners.forEach((p) => p());
  }

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "__disk__" + nanoid();

  static From({ guid, type, indexCache }: DiskJType): Disk {
    const DiskMap = {
      [IndexedDbDisk.type]: IndexedDbDisk,
      [MemDisk.type]: MemDisk,
      [DexieFsDbDisk.type]: DexieFsDbDisk,
      [NullDisk.type]: NullDisk,
      [OpFsDisk.type]: OpFsDisk,
    };
    if (!DiskMap[type]) throw new Error("invalid disk type " + type);
    const DiskConstructor = DiskMap[type] satisfies {
      new (guid: string): Disk; //TODO interface somewhere?
    };
    return new DiskConstructor(guid, indexCache ?? new TreeDirRoot());
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
    return filePath;
  }

  async *scan(): AsyncGenerator<{
    filePath: AbsPath;
    text: string;
  }> {
    const textNodes = this.fileTree.all().filter((node) => node.getMimeType().startsWith("text"));
    const results = await Promise.all(
      textNodes.map(async (node) => {
        const text = String(await this.readFile(node.path));
        return [node, text] as [TreeNode, string];
      })
    );
    for (const [node, text] of results) {
      yield { filePath: node.path, text };
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

  remoteUpdateListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return this.remote.on(DiskEvents.WRITE, async ({ filePaths }) => {
      if (filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }

  async renameMultiple(nodes: [from: TreeNode, to: TreeNode | AbsPath][]): Promise<RenameFileType[]> {
    if (nodes.length === 0) return [];
    const results: RenameFileType[] = [];
    for (const [oldNode, newNode] of nodes) {
      /*no mutex everything runs sequentially*/
      const result = await this.quietlyRenameDirOrFile(
        oldNode.path,
        newNode instanceof TreeNode ? newNode.path : newNode,
        oldNode.type
      );
      results.push(result);
    }
    return this.broadcastRename(results);
  }
  async renameDir(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return (await this.renameDirOrFileDiskMethod(oldFullPath, newFullPath, "dir"))[0]!;
  }
  async renameFile(oldFullPath: AbsPath, newFullPath: AbsPath): Promise<RenameFileType> {
    return (await this.renameDirOrFileDiskMethod(oldFullPath, newFullPath, "file"))[0]!;
  }
  //for moving files without emitting events or updating the index
  async quietMove(oldPath: AbsPath, newPath: AbsPath, options?: { overWrite?: boolean }): Promise<AbsPath> {
    let finalPath = newPath;
    if (await this.pathExists(oldPath)) {
      if (!options?.overWrite !== true) {
        finalPath = await this.nextPath(newPath);
      } else {
        await this.quietRemove(newPath);
      }
    }
    await this.mkdirRecursive(absPath(dirname(finalPath)));
    await this.fs.rename(encodePath(oldPath), encodePath(finalPath));
    return finalPath;
  }

  protected async renameDirOrFileDiskMethod(...properties: Parameters<typeof this.quietlyRenameDirOrFile>) {
    return this.broadcastRename([await this.quietlyRenameDirOrFile(...properties)]);
  }
  protected async quietlyRenameDirOrFile(
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

    return CHANGE;
  }

  private async broadcastDelete(filePaths: AbsPath[]) {
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

  private async broadcastRename(change: RenameFileType[]) {
    await this.fileTreeIndex();
    void this.remote.emit(DiskEvents.RENAME, change);
    await this.local.emit(DiskEvents.RENAME, change);
    await this.local.emit(DiskEvents.INDEX, {
      type: "rename",
      details: change,
    });
    return change;
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
    for (const filePath of reduceLineage(filePaths)) {
      await this.quietRemove(filePath);
    }
    return this.broadcastDelete(filePaths);
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
    //TODO donno why indexing
    void this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
  }
  addVirtualFileFromSource(
    props: Pick<TreeNode, "type" | "name"> & { sourceNode: TreeNode },
    parentNode: TreeNode | null
  ): VirtualDupTreeNode {
    const parent = parentNode || this.fileTree.root;
    const node = this.fileTree
      .insertClosestVirtualNode({ type: props.type, name: props.name }, parent)
      .tagSource(props.sourceNode);
    void this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
    return node;
  }

  addVirtualFile(props: Pick<TreeNode, "type" | "name">, selectedNode: TreeNode | null): TreeNode {
    const parent = selectedNode || this.fileTree.root;
    const node = this.fileTree.insertClosestVirtualNode({ type: props.type, name: props.name }, parent);
    void this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
    return node;
  }
  async nextPath(fullPath: AbsPath) {
    await this.ready;
    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    return fullPath;
  }
  async newFiles<T extends string | Uint8Array | Blob>(files: [AbsPath, T | Promise<T>][]): Promise<AbsPath[]> {
    await this.ready;
    const result: AbsPath[] = [];
    // eslint-disable-next-line prefer-const
    for (let [fullPath, content] of files) {
      while (await this.pathExists(fullPath)) {
        fullPath = incPath(fullPath);
      }
      result.push(fullPath);
      await this.writeFileRecursive(fullPath, await content);
    }
    await this.fileTreeIndex();
    await this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: result },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: result },
    });
    return result;
  }
  async indexAndEmitNewFiles(filePaths: AbsPath[]) {
    await this.fileTreeIndex();
    await this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths },
    });
  }

  static async TransferFiles(
    transferNodes: [from: TreeNode, to: AbsPath][],
    fromDisk: Disk,
    toDisk: Disk,
    removeSourceNodes: boolean = false
  ) {
    console.debug(`Transferring ${transferNodes.length} files from ${fromDisk.guid} to ${toDisk.guid}`);
    const dirs = await Promise.all(
      transferNodes.filter(([node]) => node.isTreeDir()).map(([_node, targetPath]) => toDisk.mkdirRecursive(targetPath))
    );

    const paths = await toDisk.newFiles(
      transferNodes
        .filter(([node]) => node.isTreeFile())
        .map(([node, targetPath]) => [
          joinPath(dirname(targetPath), basename(targetPath)),
          fromDisk.readFile(node.path),
        ])
    );

    if (removeSourceNodes) {
      console.debug(`Removing ${transferNodes.length} files from ${fromDisk.guid}`);
      await fromDisk.removeMultipleFiles(transferNodes.map(([node]) => node.path));
    }
    return [...dirs, ...paths];
  }

  private async copyDirQuiet(oldFullPath: AbsPath, newFullPath: AbsPath, overWrite?: boolean) {
    await this.ready;
    if (await this.pathExists(newFullPath)) {
      if (!overWrite) {
        newFullPath = await this.nextPath(newFullPath);
      } else {
        await this.quietRemove(newFullPath);
      }
    }
    await this.mkdirRecursive(absPath(dirname(newFullPath)));
    const entries = await this.fs.readdir(encodePath(oldFullPath));
    for (const entry of entries) {
      const oldEntryPath = joinPath(oldFullPath, String(entry));
      const newEntryPath = joinPath(newFullPath, String(entry));
      if (typeof entry === "string" || entry instanceof String) {
        if ((await this.fs.stat(encodePath(oldEntryPath))).isDirectory()) {
          await this.copyDirQuiet(oldEntryPath, newEntryPath, overWrite);
        } else {
          await this.copyFileQuiet(oldEntryPath, newEntryPath, overWrite);
        }
      } else {
        console.warn(`Skipping non-string entry: ${entry}`);
      }
    }
    await this.fileTreeIndex();
    await this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [newFullPath] },
    });
    await this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [newFullPath] },
    });
    return newFullPath;
  }

  async copyDir(oldFullPath: AbsPath, newFullPath: AbsPath, overWrite?: boolean) {
    const fullPath = await this.copyDirQuiet(oldFullPath, newFullPath, overWrite);
    await this.fileTreeIndex();
    //TODO events are weird for copy idk how to do them
    void this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });
    return newFullPath;
  }
  private async copyFileQuiet(oldFullPath: AbsPath, newFullPath: AbsPath, overWrite?: boolean) {
    await this.ready;
    const oldContent = await this.readFile(oldFullPath); //yeeesh wish i could pipe this!
    //alternatively if have access to pipes, mv old file to tmp first then copy then
    //remove tmp
    if (await this.pathExists(newFullPath)) {
      if (!overWrite) {
        newFullPath = await this.nextPath(newFullPath);
      } else {
        await this.quietRemove(newFullPath);
      }
    }

    await this.mkdirRecursive(absPath(dirname(newFullPath)));
    await this.fs.writeFile(encodePath(newFullPath), oldContent, {
      encoding: "utf8",
      mode: 0o777,
    });

    return newFullPath;
  }
  async copyFile(oldFullPath: AbsPath, newFullPath: AbsPath, overWrite?: boolean) {
    const fullPath = await this.copyFileQuiet(oldFullPath, newFullPath, overWrite);
    await this.fileTreeIndex();
    void this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [fullPath] },
    });
    return fullPath;
  }
  async copyMultiple(
    copyPaths: [from: TreeNode, to: AbsPath | TreeNode][],
    options?: { overWrite?: boolean }
  ): Promise<AbsPath[]> {
    await this.ready;
    const result: AbsPath[] = [];
    for (const [from, to] of copyPaths) {
      let fullPath = to;
      if (await this.pathExists(from)) {
        fullPath = from.isTreeFile()
          ? await this.copyFileQuiet(absPath(from), absPath(to), options?.overWrite)
          : await this.copyDirQuiet(absPath(from), absPath(to), options?.overWrite);
      }
      result.push(absPath(fullPath));
    }
    await this.fileTreeIndex();
    void this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: result },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: result },
    });
    return result;
  }

  async newFile(fullPath: AbsPath, content: string | Uint8Array | Blob) {
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
  async writeFileRecursive(filePath: AbsPath, content: string | Uint8Array | Blob) {
    await this.ready;
    await this.mkdirRecursive(absPath(dirname(filePath)));
    try {
      let data: string | Uint8Array;
      if (content instanceof Blob) {
        data = new Uint8Array(await content.arrayBuffer());
      } else {
        data = content;
      }
      return this.fs.writeFile(encodePath(filePath), data, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }
  async pathExists(filePath: AbsPath | TreeNode) {
    await this.ready;
    try {
      await this.fs.stat(encodePath(filePath));
      return true;
    } catch (_e) {
      return false;
    }
  }

  async writeFile<T extends string | Uint8Array>(filePath: AbsPath, contents: T | Promise<T>) {
    const awaitedContents = contents instanceof Promise ? await contents : contents;
    await this.fs.writeFile(encodePath(filePath), awaitedContents, { encoding: "utf8", mode: 0o777 });
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
    return this.connector.delete();
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
  type = OpFsDisk.type;
  ready: Promise<void>;
  private internalFs: OPFSNamespacedFs;
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const mutex = new Mutex();
    const { promise, resolve } = Promise.withResolvers<void>();
    const patchedOPFS = new PatchedOPFS(
      navigator.storage.getDirectory().then(async (dir) => {
        resolve();
        return dir;
      }) as Promise<IFileSystemDirectoryHandle>
    );

    const fs = new OPFSNamespacedFs(patchedOPFS.promises, absPath("/" + guid));

    super(guid, new MutexFs(fs, mutex), new FileTree(fs, guid, mutex), DiskDAO.New(OpFsDisk.type, guid, indexCache));

    this.internalFs = fs;
    this.ready = promise;
  }

  async delete() {
    await Promise.all([this.internalFs.tearDown(), ClientDb.disks.delete(this.guid)]);
  }
}

export class DexieFsDbDisk extends Disk {
  static type: DiskType = "DexieFsDbDisk";
  type = DexieFsDbDisk.type;
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const fs = new DexieFsDb(guid);
    const mt = new Mutex();
    const ft = indexCache ? FileTree.FromJSON(indexCache, fs, guid, mt) : new FileTree(fs, guid, mt);
    super(guid, fs, ft, DiskDAO.New(DexieFsDbDisk.type, guid, indexCache));
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  type = IndexedDbDisk.type;
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const mutex = new Mutex();
    const fs = new LightningFs();
    const mutexFs = new MutexFs(fs.promises, mutex);
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mutex)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mutex);

    super(guid, mutexFs, ft, DiskDAO.New(IndexedDbDisk.type, guid, indexCache));
    this.ready = fs.init(guid) as unknown as Promise<void>;
  }
}

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  type = MemDisk.type;
  constructor(public readonly guid: string, indexCache?: TreeDirRootJType) {
    const mt = new Mutex();
    const fs = memfs().fs;
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mt)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs.promises), guid, mt);

    super(guid, fs.promises, ft, DiskDAO.New(MemDisk.type, guid, indexCache));
  }
}

export class NullDisk extends Disk {
  static type: DiskType = "NullDisk";
  type = NullDisk.type;
  constructor(public readonly guid = "null", _indexCache?: TreeDirRootJType) {
    const fs = memfs().fs;
    const mt = new Mutex();
    const ft = new FileTree(fs.promises, guid, mt);
    super("null", fs.promises, ft, DiskDAO.New(NullDisk.type, guid));
  }
}
