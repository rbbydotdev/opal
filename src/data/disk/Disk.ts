import { DiskDAO } from "@/data/disk/DiskDAO";
import {
  DiskEvents,
  DiskEventsLocal,
  DiskEventsLocalFullPayload,
  DiskEventsRemote,
  FilePathsType,
  IndexTrigger,
  RemoteRenameFileType,
  RenameFileType,
  SIGNAL_ONLY,
} from "@/data/disk/DiskEvents";
import { DiskType } from "@/data/DiskType";
import { CommonFileSystem, mkdirRecursive } from "@/data/FileSystemTypes";
import { errF, errorCode, isErrorWithCode, NotFoundError, ServiceUnavailableError } from "@/lib/errors";
import { FileTree } from "@/lib/FileTree/Filetree";
import { SourceTreeNode, TreeDir, TreeDirRoot, TreeNode, TreeNodeDirJType } from "@/lib/FileTree/TreeNode";
import { isServiceWorker, isWebWorker } from "@/lib/isServiceWorker";
import { replaceFileUrlsInMarkdown } from "@/lib/markdown/replaceFileUrlsInMarkdown";
import { replaceImageUrlsInMarkdown } from "@/lib/markdown/replaceImageUrlsInMarkdown";
import { OmniBus } from "@/lib/OmniBus";
import {
  AbsPath,
  absPath,
  basename,
  dirname,
  incPath,
  joinPath,
  reduceLineage,
  relPath,
  stringifyEntry,
} from "@/lib/paths2";
import { Mutex } from "async-mutex";
import { nanoid } from "nanoid";

export abstract class Disk {
  static readonly IDENT = Symbol("Disk");
  instanceId = nanoid();
  remote: DiskEventsRemote;
  local: DiskEventsLocal;
  ready: Promise<void> = Promise.resolve();
  mutex = new Mutex();
  _fs: CommonFileSystem;
  _fileTree: FileTree;
  private unsubs: (() => void)[] = [];
  abstract type: DiskType;

  get dirName(): string | null {
    return null;
  }

  get fs() {
    return this._fs;
  }
  set fs(value: CommonFileSystem) {
    this._fs = value;
  }

  get fileTree() {
    return this._fileTree;
  }
  set fileTree(value: FileTree) {
    this._fileTree = value;
  }
  get isNull() {
    return this.type === "NullDisk";
  }

  getFlatTree({
    filterIn,
    filterOut,
  }: {
    filterIn?: (node: TreeNode) => boolean;
    filterOut?: (node: TreeNode) => boolean;
  }) {
    if (filterIn || filterOut) {
      return this.fileTree
        .all()
        .filter((node) => {
          if (filterIn && !filterIn(node)) return false;
          if (filterOut && filterOut(node)) return false;
          return true;
        })
        .map((node) => node.path);
    }
    return this.fileTree.all().map((node) => node.path);
  }

  constructor(
    public readonly guid: string,
    fs: CommonFileSystem,
    fileTree: FileTree,
    private connector: DiskDAO
  ) {
    this._fs = fs;
    this._fileTree = fileTree;
    this.remote = new DiskEventsRemote(this.guid);
    this.local = new DiskEventsLocal(this.guid, this.instanceId);
    this.unsubs.push(OmniBus.connect(Disk.IDENT, this.local));
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
    return this.fileTree;
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
    // newIndex.walk((node) => {});
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
    return OmniBus.onType<DiskEventsLocalFullPayload, "index">(Disk.IDENT, "index", async (trigger) => {
      if (trigger.diskId === this.guid) {
        // Same disk, different instance = cross-instance event
        if (trigger.instanceId && trigger.instanceId !== this.instanceId) {
          await this.fileTreeIndex(); // Re-index this instance
        }
        callback(this.fileTree.root, trigger);
      }
    });
  }

  async refresh() {
    const { indexCache } = await this.connector.hydrate();
    return this.initialIndexFromCache(indexCache ?? new TreeDirRoot());
  }
  async init({ skipListeners }: { skipListeners?: boolean } = {}) {
    await this.ready;
    const { indexCache } = await this.connector.hydrate();
    this.initialIndexFromCache(indexCache ?? new TreeDirRoot()); //load first from cache
    await this.hydrateIndexFromDisk();
    if (isServiceWorker() || isWebWorker() || skipListeners) {
      console.debug(
        `skipping remote listeners (reason ${isServiceWorker() ? "service worker" : isWebWorker() ? "web worker" : "skipListeners"})`
      );
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
      this.remote.on(DiskEvents.INDEX, async (data) => {
        if (data?.type === "rename") return handleRename(data.details);
      }),
      this.remote.on(DiskEvents.INDEX, handleIndex),
    ];
    return () => listeners.forEach((p) => p());
  }

  static guid = () => "__disk__" + nanoid();

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
    return OmniBus.onType<DiskEventsLocalFullPayload, "index">(Disk.IDENT, "index", (trigger) => {
      if (trigger?.type === "rename" && trigger.diskId === this.guid) {
        fn(trigger.details);
      }
    });
  }
  deleteListener(fn: (props: Extract<IndexTrigger, { type: "delete" }>["details"]) => void) {
    return OmniBus.onType<DiskEventsLocalFullPayload, "index">(Disk.IDENT, "index", (trigger) => {
      if (trigger?.type === "delete" && trigger.diskId === this.guid) {
        fn(trigger.details);
      }
    });
  }
  createListener(fn: (props: Extract<IndexTrigger, { type: "create" }>["details"]) => void) {
    return OmniBus.onType<DiskEventsLocalFullPayload, "index">(Disk.IDENT, "index", (trigger) => {
      if (trigger?.type === "create" && trigger.diskId === this.guid) {
        fn(trigger.details);
      }
    });
  }

  writeIndexListener(callback: () => void) {
    return OmniBus.onType<DiskEventsLocalFullPayload, "outside-write" | "index">(
      Disk.IDENT,
      ["outside-write", "index"],
      (trigger) => {
        if (trigger.diskId === this.guid) {
          callback();
        }
      }
    );
  }

  outsideWriteListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return OmniBus.onType<DiskEventsLocalFullPayload, "outside-write">(Disk.IDENT, "outside-write", async (trigger) => {
      if (trigger.diskId === this.guid && trigger.filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }
  insideWriteListener(watchFilePath: AbsPath, fn: (contents: string) => void) {
    return OmniBus.onType<DiskEventsLocalFullPayload, "inside-write">(Disk.IDENT, "inside-write", async (trigger) => {
      if (trigger.diskId === this.guid && trigger.filePaths.includes(watchFilePath)) {
        fn(String(await this.readFile(absPath(watchFilePath))));
      }
    });
  }
  dirtyListener(cb: (trigger: FilePathsType | IndexTrigger | undefined) => void) {
    return OmniBus.onType<DiskEventsLocalFullPayload, "inside-write" | "outside-write" | "index">(
      Disk.IDENT,
      ["inside-write", "outside-write", "index"],
      (trigger) => {
        if (trigger.diskId === this.guid) {
          cb(trigger);
        }
      }
    );
  }

  async renameMultiple(nodes: [from: TreeNode, to: TreeNode | AbsPath][]): Promise<RenameFileType[]> {
    if (nodes.length === 0) return [];
    const results: RenameFileType[] = [];
    for (const [oldNode, newNode] of nodes) {
      /*no mutex everything runs sequentially*/
      const result = await this.quietlyRenameDirOrFile(
        oldNode,
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
    await this.fs.rename(oldPath, finalPath);
    return finalPath;
  }

  protected async renameDirOrFileDiskMethod(...properties: Parameters<typeof this.quietlyRenameDirOrFile>) {
    return this.broadcastRename([await this.quietlyRenameDirOrFile(...properties)]);
  }
  protected async quietlyRenameDirOrFile(
    oldFullPath: AbsPath | TreeNode,
    newFullPath: AbsPath,
    fileType?: "file" | "dir"
  ): Promise<RenameFileType> {
    await this.ready;
    if (!fileType) {
      if (oldFullPath instanceof TreeNode) {
        fileType = oldFullPath.isTreeDir() ? "dir" : "file";
      } else {
        const stat = await this.fs.stat(oldFullPath);
        fileType = stat.isDirectory() ? "dir" : "file";
      }
    }
    const NOCHANGE: RenameFileType = new RenameFileType({
      fileType: fileType,
      newPath: String(oldFullPath),
      newName: relPath(basename(oldFullPath)),
      oldPath: String(oldFullPath),
      oldName: relPath(basename(oldFullPath)),
    });

    const cleanFullPath = joinPath(absPath(dirname(newFullPath)), basename(newFullPath));
    if (!newFullPath || cleanFullPath === oldFullPath) return NOCHANGE;

    const uniquePath = await this.nextPath(cleanFullPath); // ensure the path is unique
    try {
      await this.mkdirRecursive(absPath(dirname(uniquePath)));
      await this.fs.rename(String(oldFullPath), uniquePath);
    } catch (e) {
      throw e;
    }

    const CHANGE = new RenameFileType({
      fileType,
      newPath: uniquePath,
      newName: relPath(basename(uniquePath)),
      oldName: relPath(basename(oldFullPath)),
      oldPath: String(oldFullPath),
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
    while (await this.pathExists(fullPath)) {
      fullPath = incPath(fullPath);
    }
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
      await this.fs.unlink(filePath);
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
    const oldPath = absPath(oldFullPath);
    let newPath = absPath(newFullPath);
    await this.ready;
    if (await this.pathExists(newPath)) {
      if (!overWrite) {
        newPath = await this.nextPath(newPath);
      } else {
        await this.quietRemove(newPath);
      }
    }
    await this.mkdirRecursive(absPath(dirname(newPath)));
    const entries = await this.fs.readdir(oldPath);
    for (const entry of entries) {
      const oldEntryPath = joinPath(oldPath, stringifyEntry(entry));
      const newEntryPath = joinPath(newPath, stringifyEntry(entry));
      if (typeof entry === "string" || entry instanceof String) {
        if ((await this.fs.stat(oldEntryPath)).isDirectory()) {
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
      details: { filePaths: [newPath] },
    });
    void this.remote.emit(DiskEvents.INDEX, {
      type: "create",
      details: { filePaths: [newPath] },
    });
    return newPath;
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
    const oldPath = absPath(oldFullPath);
    let newPath = absPath(newFullPath);
    await this.ready;
    const oldContent = await this.readFile(oldPath); //yeeesh wish i could pipe this!
    //alternatively if have access to pipes, mv old file to tmp first then copy then
    //remove tmp
    if (await this.pathExists(newPath)) {
      if (!overWrite) {
        newPath = await this.nextPath(newPath);
      } else {
        await this.quietRemove(newPath);
      }
    }

    await this.mkdirRecursive(dirname(newPath));
    await this.fs.writeFile(newPath, oldContent, {
      encoding: "utf8",
      mode: 0o777,
    });

    return newPath;
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
      return this.fs.writeFile(filePath, data, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }
  async pathExists(filePath: AbsPath | TreeNode) {
    await this.ready;
    try {
      await this.fs.stat(String(filePath));
      return true;
    } catch (_e) {
      return false;
    }
  }

  async writeFile<T extends string | Uint8Array>(filePath: AbsPath, contents: T | Promise<T>) {
    const awaitedContents = contents instanceof Promise ? await contents : contents;
    console.log(`Disk.writeFile: Writing file ${filePath}`);
    await this.fs.writeFile(filePath, awaitedContents, { encoding: "utf8", mode: 0o777 });
    void this.remote.emit(DiskEvents.OUTSIDE_WRITE, { filePaths: [filePath] });
    void this.local.emit(DiskEvents.INSIDE_WRITE, { filePaths: [filePath] });
    return;
  }
  async readFile(filePath: AbsPath) {
    console.log(`Disk.readFile: Reading file ${filePath}`);
    await this.ready;
    try {
      return await this.fs.readFile(filePath);
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
