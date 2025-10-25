import { CommonFileSystem, OPFSNamespacedFs } from "@/Db/CommonFileSystem";
import { DexieFsDb } from "@/Db/DexieFsDb";
import { DirectoryHandleStore } from "@/Db/DirectoryHandleStore";
import { DiskDAO } from "@/Db/DiskDAO";
import {
  DiskEvents,
  DiskEventsLocal,
  DiskEventsRemote,
  FilePathsType,
  IndexTrigger,
  RemoteRenameFileType,
  RenameFileType,
  SIGNAL_ONLY,
} from "@/Db/DiskEvents";
import { DiskMap } from "@/Db/DiskMap";
import { DiskJType, DiskType } from "@/Db/DiskType";
import { ClientDb } from "@/Db/instance";
import { KVFileSystem, LocalStorageStore } from "@/Db/KVFs";
import { MutexFs } from "@/Db/MutexFs";
import { PatchedOPFS } from "@/Db/NamespacedFs";
import { PatchedDirMountOPFS } from "@/Db/PatchedDirMountOPFS";
import { errF, errorCode, isErrorWithCode, NotFoundError, ServiceUnavailableError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import { SourceTreeNode, TreeDirRoot, TreeNodeDirJType } from "@/lib/FileTree/TreeNode";
import { isServiceWorker, isWebWorker } from "@/lib/isServiceWorker";
import { replaceFileUrlsInMarkdown } from "@/lib/markdown/replaceFileUrlsInMarkdown";
import { replaceImageUrlsInMarkdown } from "@/lib/markdown/replaceImageUrlsInMarkdown";
import {
  AbsPath,
  absPath,
  basename,
  dirname,
  encodePath,
  incPath,
  joinPath,
  mkdirRecursive,
  relPath,
} from "@/lib/paths2";
import { Mutex } from "async-mutex";
import { memfs } from "memfs";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";
import { nanoid } from "nanoid";
import { TreeDir, TreeDirRootJType, TreeNode } from "../lib/FileTree/TreeNode";
import { reduceLineage, stringifyEntry } from "../lib/paths2";
import { RequestSignalsInstance } from "../lib/RequestSignals";

export abstract class Disk {
  static defaultDiskType: DiskType = "IndexedDbDisk";

  remote: DiskEventsRemote;
  local = new DiskEventsLocal(); //oops this should be put it init but i think it will break everything
  ready: Promise<void> = Promise.resolve();
  mutex = new Mutex();
  // private origFs: CommonFileSystem | null = null;
  private unsubs: (() => void)[] = [];
  abstract type: DiskType;

  get dirName(): string | null {
    return null;
  }

  constructor(
    public readonly guid: string,
    protected fs: CommonFileSystem,
    //TODO move things into protected to isolate property digging
    readonly fileTree: FileTree,
    private connector: DiskDAO
  ) {
    this.remote = new DiskEventsRemote(this.guid);
  }

  static FromJSON(json: DiskJType, fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs): Disk {
    return Disk.From({ guid: json.guid, type: json.type, indexCache: json.indexCache }, fsTransform);
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
      void this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
    } catch (e) {
      throw new ServiceUnavailableError(errF`Error initializing index ${e}`);
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

  triggerIndex = async () => {
    await this.fileTreeIndex();
    void this.local.emit(DiskEvents.INDEX, SIGNAL_ONLY);
  };

  private fileTreeIndex = async ({
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

  getFirstFile(): TreeNode | null {
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

  async refresh() {
    const { indexCache } = await this.connector.hydrate();
    this.initialIndexFromCache(indexCache ?? new TreeDirRoot());
  }
  // async init({ skipListeners, onError }: { skipListeners?: boolean; onError?: (error: Error) => void } = {}) {
  async init({ skipListeners }: { skipListeners?: boolean } = {}) {
    await this.ready;
    const { indexCache } = await this.connector.hydrate();
    this.initialIndexFromCache(indexCache ?? new TreeDirRoot()); //load first from cache
    await this.hydrateIndexFromDisk(); /*.catch((error: Error) => {
      if (onError) onError(error);
      else console.warn("Failed to hydrate index from disk, continuing with cached index:", error);
    });*/
    if (isServiceWorker() || isWebWorker() || skipListeners) {
      console.debug("skipping remote listeners in service worker");
      return () => {};
    } else {
      return this.setupRemoteListeners();
    }
  }

  async setupRemoteListeners() {
    const handleRename = async (data: RemoteRenameFileType[]) => {
      // void this.local.emit(DiskEvents.RENAME, data.map(RenameFileType.New));
      await this.fileTreeIndex();
      void this.local.emit(DiskEvents.INDEX, {
        type: "rename",
        details: data,
      });
      console.debug("remote rename", JSON.stringify(data, null, 4));
    };
    const handleIndex = async (data: IndexTrigger | undefined) => {
      await this.fileTreeIndex();
      void this.local.emit(DiskEvents.INDEX, data);
    };

    const handleOutsideWrite = async ({ filePaths }: FilePathsType) => {
      void this.local.emit(DiskEvents.OUTSIDE_WRITE, { filePaths });
    };

    const listeners = [
      this.remote.init(),
      this.remote.on(DiskEvents.OUTSIDE_WRITE, handleOutsideWrite),
      // >>>>>>>> this.remote.on(DiskEvents.RENAME, handleRename),
      this.remote.on(DiskEvents.INDEX, async (data) => {
        if (data?.type === "rename") return handleRename(data.details);
      }),
      this.remote.on(DiskEvents.INDEX, handleIndex),
    ];
    return () => listeners.forEach((p) => p());
  }

  static guid = () => "__disk__" + nanoid();

  static From(
    { guid, type, indexCache }: DiskJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ): Disk {
    if (!DiskMap[type]) throw new Error("invalid disk type " + type);
    const DiskConstructor = DiskMap[type] satisfies {
      new (guid: string): Disk; //TODO interface somewhere?
    };
    return new DiskConstructor(guid, indexCache ?? new TreeDirRoot(), fsTransform);
  }

  private async *iteratorMutex(filter?: (node: TreeNode) => boolean): AsyncIterableIterator<TreeNode> {
    await this.ready;
    await this.mutex.acquire();
    for (const node of this.fileTree.iterator(filter)) {
      yield node;
    }
    this.mutex.release();
  }

  async findReplaceImgBatch(findReplace: [string, string][], origin: string = ""): Promise<AbsPath[]> {
    if (findReplace.length === 0) return [];
    const filePaths = [];
    for await (const node of await this.iteratorMutex((node) => node.isMarkdownFile())) {
      const [newContent, changed] = await replaceImageUrlsInMarkdown(
        String(await this.readFile(node.path)),
        findReplace,
        origin
      );

      if (changed) {
        await this.writeFile(node.path, newContent);
        filePaths.push(node.path);
      }
    }
    if (filePaths.length) {
      void this.local.emit(DiskEvents.OUTSIDE_WRITE, {
        filePaths,
      });
    }
    return filePaths;
  }

  async findReplaceFileBatch(findReplace: [string, string][], origin: string = ""): Promise<AbsPath[]> {
    if (findReplace.length === 0) return [];
    const filePaths = [];
    for await (const node of await this.iteratorMutex((node) => node.isMarkdownFile())) {
      const [newContent, changed] = await replaceFileUrlsInMarkdown(
        String(await this.readFile(node.path)),
        findReplace,
        origin
      );

      if (changed) {
        await this.writeFile(node.path, newContent);
        filePaths.push(node.path);
      }
    }
    if (filePaths.length) {
      void this.local.emit(DiskEvents.OUTSIDE_WRITE, {
        filePaths,
      });
    }
    return filePaths;
  }

  get mkdirRecursive() {
    return mkdirRecursive.bind(this.fs);
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

  writeIndexListener(callback: () => void) {
    return this.local.on([DiskEvents.OUTSIDE_WRITE, DiskEvents.INDEX], callback);
  }

  outsideWriteListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return this.local.on(DiskEvents.OUTSIDE_WRITE, async ({ filePaths }) => {
      if (filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }
  insideWriteListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return this.local.on(DiskEvents.INSIDE_WRITE, async ({ filePaths }) => {
      if (filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }
  dirtyListener(cb: (trigger: FilePathsType | IndexTrigger | undefined) => void) {
    return this.local.on([DiskEvents.INSIDE_WRITE, DiskEvents.OUTSIDE_WRITE, DiskEvents.INDEX], cb);
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
    void this.local.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths },
    });
  }

  private async broadcastRename(change: RenameFileType[]) {
    await this.fileTreeIndex();
    // void this.remote.emit(DiskEvents.RENAME, change);
    void this.remote.emit(DiskEvents.INDEX, {
      type: "rename",
      details: change,
    });
    // void this.local.emit(DiskEvents.RENAME, change);
    void this.local.emit(DiskEvents.INDEX, {
      type: "rename",
      details: change,
    });
    return change;
  }

  async newDir(fullPath: AbsPath) {
    // await this.ready;

    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
    console.debug("Creating new dir at", fullPath);
    await this.mkdirRecursive(fullPath);
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
      //TODO: run clean up for file ? like document id etc?
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
    void this.local.emit(DiskEvents.INDEX, {
      type: "delete",
      details: { filePaths: [filePath] },
    });
    void this.remote.emit(DiskEvents.INDEX, {
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

  addVirtualFile(options: {
    type: TreeNode["type"];
    basename: TreeNode["basename"];
    selectedNode?: TreeNode | null;
    virtualContent?: string;
    source?: TreeNode;
  }): TreeNode {
    const parent = options.selectedNode || this.fileTree.root;

    const node = this.fileTree.insertClosestVirtualNode(
      { type: options.type, basename: options.basename },
      parent,
      options.virtualContent
    );

    if (options.source) {
      node.tagSource(options.source);
    }

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
    for (let [fullPath, content] of files) {
      while (await this.pathExists(fullPath)) {
        fullPath = incPath(fullPath);
      }
      result.push(fullPath);
      await this.writeFileRecursive(fullPath, await content);
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
  async indexAndEmitNewFiles(filePaths: AbsPath[]) {
    await this.fileTreeIndex();
    void this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths },
    });
  }

  private async copyDirQuiet(oldFullPath: AbsPath | TreeNode, newFullPath: AbsPath | TreeNode, overWrite?: boolean) {
    const _oldFullPath = absPath(oldFullPath);
    let _newFullPath = absPath(newFullPath);
    await this.ready;
    if (await this.pathExists(_newFullPath)) {
      if (!overWrite) {
        _newFullPath = await this.nextPath(_newFullPath);
      } else {
        await this.quietRemove(_newFullPath);
      }
    }
    await this.mkdirRecursive(absPath(dirname(_newFullPath)));
    const entries = await this.fs.readdir(encodePath(_oldFullPath));
    for (const entry of entries) {
      const oldEntryPath = joinPath(_oldFullPath, stringifyEntry(entry));
      const newEntryPath = joinPath(_newFullPath, stringifyEntry(entry));
      if (typeof entry === "string" || entry instanceof String) {
        if ((await this.fs.stat(encodePath(oldEntryPath))).isDirectory()) {
          await this.copyDirQuiet(oldEntryPath, newEntryPath, overWrite);
        } else {
          await this.copyFileQuiet(oldEntryPath, newEntryPath, overWrite);
        }
      } else {
        console.warn(`Skipping non-string entry: ${stringifyEntry(entry)}`);
      }
    }
    await this.fileTreeIndex();
    void this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [_newFullPath] },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [_newFullPath] },
    });
    return _newFullPath;
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
  private async copyFileQuiet(oldFullPath: AbsPath | TreeNode, newFullPath: AbsPath | TreeNode, overWrite?: boolean) {
    const _oldFullPath = absPath(oldFullPath);
    let _newFullPath = absPath(newFullPath);
    await this.ready;
    const oldContent = await this.readFile(_oldFullPath); //yeeesh wish i could pipe this!
    //alternatively if have access to pipes, mv old file to tmp first then copy then
    //remove tmp
    if (await this.pathExists(_newFullPath)) {
      if (!overWrite) {
        _newFullPath = await this.nextPath(_newFullPath);
      } else {
        await this.quietRemove(_newFullPath);
      }
    }

    await this.mkdirRecursive(dirname(_newFullPath));
    await this.fs.writeFile(encodePath(_newFullPath), oldContent, {
      encoding: "utf8",
      mode: 0o777,
    });

    return _newFullPath;
  }
  async copyFile(oldFullPath: AbsPath, newFullPath: AbsPath, overWrite?: boolean) {
    const fullPath = await this.copyFileQuiet(oldFullPath, newFullPath, overWrite);
    await this.fileTreeIndex();
    void this.local.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [absPath(fullPath)] },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [absPath(fullPath)] },
    });
    return fullPath;
  }

  async copyMultipleSourceNodes(sourceNodes: SourceTreeNode[], fromDisk: Disk): Promise<AbsPath[]> {
    await this.ready;
    let result: AbsPath[] = [];
    sourceNodes = reduceLineage(sourceNodes);
    for (const node of sourceNodes) {
      node.path = await this.nextPath(node.path);
      for (const n of node.iterator()) {
        if (n.isTreeDir()) result.push((await this.mkdirRecursive(n.path)) as AbsPath);
        else {
          await this.writeFile(n.path, await fromDisk.readFile(n.source));
          result.push(n.path);
        }
      }
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
  async copyMultiple(
    copyPaths: [from: TreeNode, to: AbsPath | TreeNode][],
    options?: { overWrite?: boolean }
  ): Promise<AbsPath[]> {
    await this.ready;
    const result: AbsPath[] = [];
    // console.log(copyPaths);
    // for (const [from, to] of copyPaths) {
    //   console.log(from.path, "->", to instanceof TreeNode ? to.path : to);
    // }

    // return [];
    for (const [from, to] of copyPaths) {
      let fullPath = to;
      if (await this.pathExists(from)) {
        fullPath = from.isTreeFile()
          ? await this.copyFileQuiet(from, to, options?.overWrite)
          : await this.copyDirQuiet(from, to, options?.overWrite);
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
  async writeFileRecursive(filePath: AbsPath, content: string | Uint8Array | Blob) {
    await this.ready;
    // console.log(`writeFileRecursive: Creating directory for ${dirname(filePath)}`);
    await this.mkdirRecursive(dirname(filePath));
    try {
      let data: string | Uint8Array;
      if (content instanceof Blob) {
        data = new Uint8Array(await content.arrayBuffer());
      } else {
        data = content;
      }
      // console.log(`writeFileRecursive: Writing file ${filePath}`);
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
      await this.fs.stat(encodePath(String(filePath)));
      return true;
    } catch (_e) {
      return false;
    }
  }

  async writeFile<T extends string | Uint8Array>(filePath: AbsPath, contents: T | Promise<T>) {
    const awaitedContents = contents instanceof Promise ? await contents : contents;
    await this.fs.writeFile(encodePath(filePath), awaitedContents, { encoding: "utf8", mode: 0o777 });
    void this.remote.emit(DiskEvents.OUTSIDE_WRITE, { filePaths: [filePath] });
    void this.local.emit(DiskEvents.INSIDE_WRITE, { filePaths: [filePath] });
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

  async destroy() {
    void this.tearDown();
    return this.connector.delete();
  }

  async tearDown() {
    await this.remote.tearDown();
    await this.local.clearListeners();
    this.unsubs.forEach((us) => us());
  }
}
export class OpFsDisk extends Disk {
  static type: DiskType = "OpFsDisk";
  type = OpFsDisk.type;
  ready: Promise<void>;
  private internalFs: OPFSNamespacedFs;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: OPFSNamespacedFs) => OPFSNamespacedFs = (fs) => fs
  ) {
    const mutex = new Mutex();
    const { promise, resolve } = Promise.withResolvers<void>();
    const patchedOPFS = new PatchedOPFS(
      navigator.storage.getDirectory().then(async (dir) => {
        resolve();
        return dir;
      }) as Promise<IFileSystemDirectoryHandle>
    );

    const origFs = new OPFSNamespacedFs(patchedOPFS.promises, absPath("/" + guid));
    const fs = fsTransform(origFs);
    void mutex.runExclusive(() => origFs.init());
    super(guid, new MutexFs(fs, mutex), new FileTree(fs, guid, mutex), DiskDAO.New(OpFsDisk.type, guid, indexCache));

    this.internalFs = fs; // as OPFSNamespacedFs;
    this.ready = promise;
  }

  async destroy() {
    await Promise.all([this.internalFs.tearDown(), ClientDb.disks.delete(this.guid)]);
  }
}

export class DexieFsDbDisk extends Disk {
  static type: DiskType = "DexieFsDbDisk";
  type = DexieFsDbDisk.type;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const fs = fsTransform(new DexieFsDb(guid));
    const mt = new Mutex();
    const ft = indexCache ? FileTree.FromJSON(indexCache, fs, guid, mt) : new FileTree(fs, guid, mt);
    super(guid, fs, ft, DiskDAO.New(DexieFsDbDisk.type, guid, indexCache));
  }
}

export class LocalStorageFsDisk extends Disk {
  static type: DiskType = "LocalStorageFsDisk";
  type = LocalStorageFsDisk.type;

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const fs = fsTransform(new KVFileSystem(new LocalStorageStore(guid)));
    const mt = new Mutex();
    const ft = indexCache ? FileTree.FromJSON(indexCache, fs, guid, mt) : new FileTree(fs, guid, mt);
    super(guid, fs, ft, DiskDAO.New(LocalStorageFsDisk.type, guid, indexCache));
  }
}

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  type = MemDisk.type;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const mt = new Mutex();
    const fs = fsTransform(memfs().fs.promises);
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs), guid, mt)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs), guid, mt);

    super(guid, fs, ft, DiskDAO.New(MemDisk.type, guid, indexCache));
  }
}

export class NullDisk extends Disk {
  static type: DiskType = "NullDisk";
  type = NullDisk.type;
  ready = new Promise<void>(() => {}); //never resolves since subsequent ops will fail

  constructor(
    public readonly guid = "__disk__NullDisk",
    _indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const fs = fsTransform(memfs().fs.promises);
    const mt = new Mutex();
    const ft = new FileTree(fs, guid, mt);
    super("__disk__NullDisk", fs, ft, DiskDAO.New(NullDisk.type, guid));
  }
  async init() {
    return () => {};
  }
}

export class OpFsDirMountDisk extends Disk {
  static type: DiskType = "OpFsDirMountDisk";
  type = OpFsDirMountDisk.type;
  ready: Promise<void>;

  private directoryHandle: FileSystemDirectoryHandle | null = null;

  get dirName() {
    return this.directoryHandle?.name ?? null;
  }

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    private fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const mutex = new Mutex();
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // Initialize with a temporary memfs until directory is selected
    const tempFs = memfs().fs;
    void mutex.acquire();
    super(
      guid,
      new MutexFs(tempFs.promises, mutex),
      new FileTree(tempFs.promises, guid, mutex),
      DiskDAO.New(OpFsDirMountDisk.type, guid, indexCache)
    );

    this.ready = promise;

    // Try to restore directory handle from storage
    this.initializeFromStorage()
      .then(() => {
        mutex.release();
        resolve();
      })
      .catch(reject);
  }

  private async initializeFromStorage(): Promise<void> {
    // console.log("🔄 Initializing from storage for disk:", this.guid);
    const handle = await DirectoryHandleStore.getHandle(this.guid);
    if (handle) {
      // console.log("✅ Found stored handle:", handle.name);
      await this.setDirectoryHandle(handle, true); // Skip storage when restoring
      // console.log("✅ Initialization from storage complete");
    } else {
      // console.log("ℹ️ No stored handle found for disk:", this.guid);
    }
  }

  async setDirectoryHandle(handle: FileSystemDirectoryHandle, skipStorage = false): Promise<void> {
    const previousHandle = this.directoryHandle;
    this.directoryHandle = handle;
    const shouldStore = !skipStorage && (!previousHandle || previousHandle.name !== handle.name);
    if (shouldStore) await DirectoryHandleStore.storeHandle(this.guid, handle);
    const patchedDirMountOPFS = this.fsTransform(
      new PatchedDirMountOPFS(Promise.resolve(handle) as unknown as Promise<IFileSystemDirectoryHandle>)
    );
    const mutex = new Mutex();
    const mutexFs = new MutexFs(patchedDirMountOPFS, mutex);
    const ft = new FileTree(patchedDirMountOPFS, this.guid, mutex);
    (this as any).fs = mutexFs;
    (this as any).fileTree = ft;
  }

  async selectDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!("showDirectoryPicker" in window)) {
      throw new Error("Directory picker not supported in this browser");
    }
    const handle = await (window as any).showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    await this.setDirectoryHandle(handle);
    return handle;
  }

  hasDirectoryHandle(): boolean {
    return this.directoryHandle !== null;
  }

  getDirectoryName(): string | null {
    return this.directoryHandle?.name || null;
  }

  async needsDirectorySelection(): Promise<boolean> {
    if (this.directoryHandle) {
      return false;
    }

    // Check if we have metadata (meaning user previously selected a directory but it was lost)
    const metadata = await DirectoryHandleStore.getStoredMetadata(this.guid);
    return metadata !== undefined;
  }

  async getStoredMetadata() {
    return DirectoryHandleStore.getStoredMetadata(this.guid);
  }

  async destroy() {
    await DirectoryHandleStore.removeHandle(this.guid);
    return super.destroy();
  }

  static async CreateWithDirectory(guid: string, indexCache?: TreeDirRootJType): Promise<OpFsDirMountDisk> {
    const disk = new OpFsDirMountDisk(guid, indexCache);
    await disk.selectDirectory();
    return disk;
  }
}
