import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { Disk } from "@/data/disk/Disk";
import {
  CreateDetails,
  DeleteDetails,
  DiskEvents,
  IndexTrigger,
  RenameDetails,
  RenameDetailsToChangeSet,
} from "@/data/disk/DiskEvents";
import { ImageCache } from "@/data/ImageCache";
import { SpecialDirs } from "@/data/SpecialDirs";
import { NamespacedThumb } from "@/data/Thumb";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { createImage } from "@/lib/createImage";
import { BadRequestError, errF } from "@/lib/errors/errors";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import {
  AbsPath,
  absPath,
  absPathname,
  basename,
  decodePath,
  dirname,
  isImage,
  joinPath,
  RelPath,
  relPath,
  resolveFromRoot,
} from "@/lib/paths2";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { WorkspaceScannable } from "@/workspace/WorkspaceScannable";
import { DiskType } from "../data/disk/DiskType";
//TODO move ww to different place
//consider using event bus, or some kind of registration or interface to seperate outside logic from main workspace logic
import {
  SourceDirTreeNode,
  SourceFileTreeNode,
  SourceTreeNode,
  TreeDir,
  TreeNode,
} from "@/components/filetree/TreeNode";
import { WorkspaceRecord } from "@/data/dao/WorkspaceRecord";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { WS_ERR_NONRECOVERABLE } from "@/data/WorkspaceStatusCode";
import { DefaultTemplate, WorkspaceTemplate } from "@/data/WorkspaceTemplates";
import { HistoryDB } from "@/editors/history/HistoryDB";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { Channel } from "@/lib/channel";
import { CreateSuperTypedEmitterClass } from "@/lib/events/TypeEmitter";
import { isIterable } from "@/lib/isIterable";
import { reduceLineage } from "@/lib/paths2";
import { SWClient } from "@/lib/service-worker/SWClient";
import debounce from "debounce";
import mime from "mime-types";
import { nanoid } from "nanoid";

const WorkspaceEvents = {
  RENAME: "rename",
  DELETE: "delete",
} as const;
type RenameTrigger = { id: string; oldName: string; newName: string };
type DeleteTrigger = { id: string };
class WorkspaceEventsRemote extends Channel<WorkspaceRemoteEventPayload> {}
class WorkspaceEventsLocal extends CreateSuperTypedEmitterClass<WorkspaceRemoteEventPayload>() {}
type WorkspaceRemoteEventPayload = {
  [WorkspaceEvents.RENAME]: RenameTrigger;
  [WorkspaceEvents.DELETE]: DeleteTrigger;
};

export class Workspace {
  imageCache: ImageCache;
  memid = nanoid();
  isNull = false;

  static newCache(id: string) {
    return new ImageCache({ guid: id, name: "img" });
  }

  name: string;
  guid: string;
  private _remoteAuths?: RemoteAuthDAO[];
  private _disk: Disk;
  private _thumbs: Disk;
  private _repo: GitRepo;
  private _playbook: GitPlaybook;
  tornDown: boolean = false;
  local = new WorkspaceEventsLocal();
  remote: WorkspaceEventsRemote;

  private unsubs: (() => void)[] = [];

  get disk() {
    return this._disk;
  }
  get repo() {
    return this._repo;
  }
  get playbook() {
    return this._playbook;
  }
  get thumbs() {
    return this._thumbs;
  }
  get remoteAuths() {
    return this._remoteAuths ?? [];
  }

  constructor(
    {
      name,
      guid,
      disk,
      thumbs,
      remoteAuths,
    }: {
      name: string;
      guid: string;
      disk: Disk;
      thumbs: Disk;
      remoteAuths?: RemoteAuthDAO[];
    },
    private connector: WorkspaceDAO
  ) {
    this.name = WorkspaceDAO.Slugify(name);
    this.guid = guid;
    this._remoteAuths = remoteAuths || [];
    this._disk = disk;
    this._thumbs = thumbs;
    this.imageCache = Workspace.newCache(this.name);
    this._repo = GitRepo.FromDisk(this.disk, `${this.id}/repo`);
    this._playbook = new GitPlaybook(this.repo);
    this.remote = new WorkspaceEventsRemote(this.guid);
  }

  get id() {
    return this.guid;
  }

  static async DeleteAll() {
    const workspaces = await WorkspaceDAO.all();
    return Promise.all(workspaces.map((workspace) => Workspace.FromDAO(workspace).destroy()));
  }

  get href() {
    return joinPath(WorkspaceDAO.rootRoute, this.name);
  }
  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      remoteAuths: (this.remoteAuths ?? []).map((ra) => ra.toJSON()),
      disk: this.disk.toJSON(),
      thumbs: this.thumbs.toJSON(),
      code: this.connector.code,
      timestamp: this.connector.timestamp,
      import: this.connector.import,
    };
  }
  static FromJSON(json: WorkspaceJType) {
    const connector = WorkspaceDAO.FromJSON(json);
    return new Workspace(
      {
        name: json.name,
        guid: json.guid,
        disk: DiskFromJSON(json.disk),
        thumbs: DiskFromJSON(json.thumbs),
        remoteAuths: json.remoteAuths.map((ra) => RemoteAuthDAO.FromJSON(ra)),
      },
      connector
    );
  }

  static FromDAO(dao: WorkspaceDAO) {
    return new Workspace(
      {
        ...dao,
        disk: DiskFromJSON(dao.disk),
        thumbs: DiskFromJSON(dao.thumbs),
        remoteAuths: dao.remoteAuths,
      },
      dao
    );
  }

  static async FromGuid(guid: string) {
    const workspaceDAO = await WorkspaceDAO.FetchFromGuid(guid);
    return Workspace.FromDAO(workspaceDAO);
  }

  static async FromNameAndInit(name: string) {
    const workspaceDAO = await WorkspaceDAO.FetchFromName(name);
    return await Workspace.FromDAO(workspaceDAO).init();
  }

  static async FromName(name: string) {
    const workspaceDAO = await WorkspaceDAO.FetchFromName(name);
    return Workspace.FromDAO(workspaceDAO);
  }

  NewThumb(path: AbsPath, size = 100) {
    return new NamespacedThumb(this.imageCache.getCache(), this.disk, path, SpecialDirs.Thumb, null, size);
  }

  async readOrMakeThumb(path: AbsPath | string, size = 100) {
    return this.NewThumb(absPath(path), size).readOrMake();
  }

  static parseWorkspacePath(pathOrUrl: string) {
    const url = new URL(pathOrUrl, "http://example");
    const pathname = absPathname(url.pathname);

    let workspaceName: string | null = null;
    let filePath: AbsPath | undefined | null = null;

    if (WorkspaceDAO.Routes.some((route) => pathname.startsWith(route))) {
      const [id, ...filePathRest] = decodePath(
        relPath(WorkspaceDAO.Routes.reduce((prev, next) => prev.replace(next, ""), String(pathname)))
      ).split("/");
      workspaceName = id || null;
      filePath = filePathRest.length ? absPath(filePathRest.join("/")) : undefined;
    }

    // Try search params if not found
    if (!workspaceName) {
      workspaceName = url.searchParams.get("workspaceId") || url.searchParams.get("workspaceName");
    }
    if (!filePath) {
      const fp = url.searchParams.get("filePath");
      filePath = fp ? absPath(fp) : null;
    }

    return { workspaceName, filePath };
  }

  static async CreateNew(
    {
      name,
      files,
      diskType,
      diskOptions,
    }: {
      name: string;
      files: WorkspaceTemplate["seedFiles"] | Iterable<SourceTreeNode>;
      diskType: DiskType;
      diskOptions?: { selectedDirectory: FileSystemDirectoryHandle | null };
    },
    properties?: Pick<WorkspaceRecord, "import">
  ): Promise<Workspace> {
    const workspaceDAO = await WorkspaceDAO.CreateNewWithDiskType(
      {
        name,
        diskType,
      },
      properties
    );

    // Disk setup logic
    if (diskType === "OpFsDirMountDisk") {
      if (!diskOptions?.selectedDirectory) {
        throw new BadRequestError("selectedDirectory is required for OpFsDirMountDisk");
      }
      const disk = DiskFromJSON(workspaceDAO.disk) as OpFsDirMountDisk;
      await disk.setDirectoryHandle(diskOptions.selectedDirectory);
    }

    const workspace = Workspace.FromDAO(workspaceDAO);

    // --- case 1: plain object seedFiles
    if (!isIterable(files)) {
      const mapped = Object.entries(files).map(([path, content]) => [
        absPath(path),
        typeof content === "function" ? content() : content,
      ]) as [AbsPath, string | Uint8Array | Blob | Promise<string | Uint8Array | Blob>][];
      await workspace.newFiles(mapped);
    }
    // --- case 2: iterable of TreeNodes
    else {
      for (const node of files) {
        const path = absPath(node.path);
        if (node.isTreeFile()) {
          await workspace.newFiles([[path, await node.read()]]);
        } else {
          await workspace.disk.mkdirRecursive(path);
        }
      }
    }

    return workspace;
  }

  static async CreateNewWithSeedFiles(name: string, diskType: DiskType) {
    return Workspace.CreateNew({
      name,
      files: DefaultTemplate.seedFiles,
      diskType,
    });
  }

  replaceUrlPath(pathname: string, oldPath: AbsPath, newPath: AbsPath) {
    const { filePath } = Workspace.parseWorkspacePath(pathname);
    if (!filePath) return pathname;
    return this.resolveFileUrl(absPath(filePath.replace(oldPath, newPath)));
  }

  newDir(dirPath: AbsPath, newDirName: RelPath) {
    return this.disk.newDir(joinPath(dirPath, newDirName));
  }
  newFile(dirPath: AbsPath, newFileName: RelPath, content: string | Blob | Uint8Array = ""): Promise<AbsPath> {
    return this.disk.newFile(joinPath(dirPath, newFileName), content);
  }
  newFiles<T extends string | Uint8Array | Blob>(files: [name: AbsPath, content: T | Promise<T>][]) {
    return this.disk.newFiles(files);
  }

  addVirtualFile(options: {
    type: TreeNode["type"];
    basename: TreeNode["basename"];
    selectedNode?: TreeNode | null;
    virtualContent?: () => Promise<string>;
    source?: TreeNode;
  }) {
    return this.disk.addVirtualFile(options);
  }

  removeVirtualfile(path: AbsPath) {
    return this.disk.removeVirtualFile(path);
  }

  async removeMultiple(filePaths: AbsPath[] | TreeNode[]) {
    //reduceLineage probably
    await Promise.all(
      filePaths.filter(isImage).flatMap((imagePath) => [
        this.NewThumb(absPath(imagePath))
          .remove()
          .catch((e) => {
            console.error(e);
          }),
        this.imageCache.getCache().then((c) => c.delete(String(imagePath))),
      ])
    );
    return this.disk.removeMultipleFiles(filePaths.map((path) => absPath(path)));
  }
  async removeSingle(filePath: AbsPath) {
    if (isImage(filePath)) {
      await Promise.all([
        this.NewThumb(filePath)
          .remove()
          .catch((e) => {
            console.error(e);
          }),
        this.imageCache.getCache().then((c) => c.delete(filePath)),
      ]);
    }
    return this.disk.removeFile(filePath);
  }

  private async adjustThumbAndCachePaths(filePathChanges: [oldNode: AbsPath | TreeNode, newPath: AbsPath][]) {
    return Promise.all(
      filePathChanges.map(async ([oldNode, newPath]) => {
        if (isImage(String(oldNode))) {
          await this.imageCache.getCache().then(async (c) => {
            const res = await c.match(String(oldNode));
            if (res) {
              await c.delete(String(oldNode));
              await c.put(newPath, res);
            }
          });
          const oldThumb = this.NewThumb(String(oldNode) as AbsPath);
          const newThumb = this.NewThumb(newPath);
          await oldThumb.move(oldThumb.path, newThumb.path).catch(async (_e) => {
            console.warn(`error moving thumb from ${oldThumb.path} to ${newThumb.path}`);
          });
        }
      })
    );
  }
  async renameSingle(from: TreeNode, to: TreeNode | AbsPath) {
    return this.renameMultiple([[from, to]] as [TreeNode, TreeNode | AbsPath][]).then((result) => {
      if (result.length === 0) return null;
      return result[0];
    });
  }

  async untrashMultiple(paths: AbsPath[]) {
    const nodes = reduceLineage(paths).map((path) => {
      const node = this.nodeFromPath(path);
      if (!node) {
        throw new BadRequestError(`Node not found for path: ${path}`);
      }
      return node;
    });

    const untrashedNodes = nodes.map((node) => {
      const fromNode = node;
      const toNode = TreeNode.FromPath(resolveFromRoot(SpecialDirs.Trash, node.path), node.type);
      return [fromNode, toNode] as [TreeNode, TreeNode];
    });

    return await this.renameMultiple(untrashedNodes);
  }

  hasTrash() {
    return Boolean(Object.keys(this.disk.fileTree.nodeFromPath(SpecialDirs.Trash)?.children ?? {}).length);
  }

  async untrashSingle(path: AbsPath) {
    const fromNode = this.nodeFromPath(path);
    if (!fromNode) {
      throw new BadRequestError(`Node not found for path: ${path}`);
    }
    const toNode = TreeNode.FromPath(resolveFromRoot(SpecialDirs.Trash, fromNode.path), fromNode.type);
    return this.renameSingle(fromNode, toNode);
  }

  async trashMultiple(paths: AbsPath[]) {
    const nodes = reduceLineage(paths).map((path) => {
      const fromNode = this.nodeFromPath(path);
      if (!fromNode) {
        throw new BadRequestError(`Node not found for path: ${path}`);
      }
      return fromNode;
    });
    const trashedNodes = nodes.map((fromNode) => {
      const toNode = TreeNode.FromPath(joinPath(SpecialDirs.Trash, fromNode.path), fromNode.type);
      return [fromNode, toNode] as [TreeNode, TreeDir];
    });
    return await this.renameMultiple(trashedNodes);
  }

  async refreshDisk() {
    await this.disk.refresh();
  }

  renameMultiple(nodes: [from: TreeNode, to: TreeNode | AbsPath][]) {
    return this.disk.renameMultiple(nodes);
  }

  readFile = (filePath: AbsPath) => {
    return this.disk.readFile(filePath);
  };

  watchDiskIndex = (callback: (fileTree: TreeDir, trigger?: IndexTrigger | void) => void) => {
    const unsub = this.disk.latestIndexListener(callback);
    this.unsubs.push(unsub);
    return unsub;
  };

  copyMultipleSourceNodes(sourceNodes: (SourceDirTreeNode | SourceFileTreeNode)[], fromDisk: Disk) {
    return this.disk.copyMultipleSourceNodes(sourceNodes, fromDisk);
  }

  recoverStatus() {
    return this.connector.recoverStatus();
  }

  isOk = () => {
    return this.connector.isOk();
  };

  async recoverDirectoryAccess(): Promise<void> {
    const disk = this.disk;
    const thumbDisk = this.thumbs;
    if (disk instanceof OpFsDirMountDisk) {
      const handle = await disk.selectDirectory();
      if (thumbDisk instanceof OpFsDirMountDisk) {
        await thumbDisk.setDirectoryHandle(handle, false);
      }
    } else {
      throw new Error("Directory access recovery is only supported for OPFS workspaces");
    }
  }

  copyMultipleFiles(copyNodes: [from: TreeNode, toRoot: AbsPath | TreeNode][]) {
    return this.disk.copyMultiple(copyNodes);
  }
  copyFile(source: AbsPath | TreeNode, targetPath: AbsPath, overWrite = false) {
    const sourceNode = this.nodeFromPath(absPath(source));
    if (sourceNode === null) {
      throw new BadRequestError(`Source file does not exist: ${source}`);
    }
    if (sourceNode.isTreeFile()) {
      return this.disk.copyFile(sourceNode.path, targetPath, overWrite);
    } else {
      return this.disk.copyDir(sourceNode.path, targetPath, overWrite);
    }
  }

  deleteWorkspaceListener(cb: () => void) {
    const unsub = this.local.on(WorkspaceEvents.DELETE, cb);
    this.unsubs.push(unsub);
    return unsub;
  }
  renameWorkspaceListener(cb: (details: RenameTrigger) => void) {
    const unsub = this.local.on(WorkspaceEvents.RENAME, cb);
    this.unsubs.push(unsub);
    return unsub;
  }

  gitRepoListener(callback: Parameters<GitRepo["infoListener"]>[0]) {
    const unsub = this.repo.infoListener(callback);
    this.unsubs.push(unsub);
    return unsub;
  }

  renameListener(callback: (details: RenameDetails[]) => void) {
    const unsub = this.disk.renameListener(callback);
    this.unsubs.push(unsub);
    return unsub;
  }

  createListener(callback: (details: CreateDetails) => void) {
    const unsub = this.disk.createListener(callback);
    this.unsubs.push(unsub);
    return unsub;
  }

  deleteListener(callback: (details: DeleteDetails) => void) {
    const unsub = this.disk.deleteListener(callback);
    this.unsubs.push(unsub);
    return unsub;
  }

  async getFirstFile() {
    await this.disk.tryFirstIndex();
    return this.disk.getFirstFile();
  }
  async awaitFirstIndex() {
    return this.disk.tryFirstIndex();
  }

  async uploadSingleImage(file: File, targetDir: AbsPath) {
    return (await this.uploadMultipleImages([file], targetDir))[0]!;
  }

  async uploadMultipleDocx(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    const result = await Workspace.UploadMultipleDocxsFetch(files, targetDir, this.name, concurrency);
    await this.indexAndEmitNewFiles(result);
    return result;
  }

  async uploadMultipleMarkdown(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    const result = await Workspace.UploadMultipleMarkdownFetch(files, targetDir, this.name, concurrency);
    await this.indexAndEmitNewFiles(result);
    return result;
  }

  static async UploadMultipleMarkdownFetch(
    files: Iterable<File>,
    targetDir: AbsPath,
    workspaceName: string,
    concurrency = 8
  ): Promise<AbsPath[]> {
    const results: AbsPath[] = [];
    let index = 0;
    const filesArr = Array.from(files);

    const uploadNext = async () => {
      if (index >= filesArr.length) return;
      const current = index++;
      const file = filesArr[current];
      await SWClient["upload-markdown"][":filePath{.+}"]
        .$post({
          query: {
            workspaceName,
          },
          form: {
            file: file!,
          },
          param: {
            filePath: joinPath(targetDir, file!.name),
          },
        })
        .then(async (res) => {
          results[current] = absPath((await res.json()).path);
        })
        .catch((e) => {
          console.error("Error uploading markdown file:", e);
        });

      await uploadNext();
    };

    const workers = Array.from({ length: Math.min(concurrency, filesArr.length) }, () => uploadNext());
    await Promise.all(workers);
    return results;
  }
  static async UploadMultipleDocxsFetch(
    files: Iterable<File>,
    targetDir: AbsPath,
    workspaceName: string,
    concurrency = 8
  ): Promise<AbsPath[]> {
    const results: AbsPath[] = [];
    let index = 0;
    const filesArr = Array.from(files);

    const uploadNext = async () => {
      if (index >= filesArr.length) return;
      const current = index++;
      const file = filesArr[current];
      await SWClient["upload-docx"][":filePath{.+}"]
        .$post({
          query: {
            workspaceName,
          },
          form: {
            file: file!,
          },
          param: {
            filePath: relPath(joinPath(targetDir, file!.name)),
          },
        })
        .then(async (res) => {
          results[current] = absPath((await res.json()).path);
        });
      await uploadNext();
    };

    const workers = Array.from({ length: Math.min(concurrency, filesArr.length) }, () => uploadNext());
    await Promise.all(workers);
    return results;
  }

  async uploadMultipleImages(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    const results = await Workspace.UploadMultipleImages(files, targetDir, this.name, concurrency);
    await this.indexAndEmitNewFiles(results);
    return results;
  }

  indexAndEmitNewFiles(files: AbsPath[]) {
    return this.disk.indexAndEmitNewFiles(files);
  }

  getFileTree() {
    return this.disk.fileTree;
  }
  getFileTreeRoot = () => {
    return this.disk.fileTree.root;
  };
  getFlatTree({
    filterIn,
    filterOut,
  }: {
    filterIn?: (node: TreeNode) => boolean;
    filterOut?: (node: TreeNode) => boolean;
  }) {
    return this.disk.getFlatTree({ filterIn, filterOut });
  }

  nodeFromPath = (path?: AbsPath | null) => {
    if (path === null || path === undefined) return null;
    return this.disk.fileTree.nodeFromPath(path);
  };
  nodesFromPaths(paths: (AbsPath | null)[]) {
    return paths.map((path) => this.nodeFromPath(path)).filter(Boolean);
  }
  //defaults to path "/" if not found
  tryNodeFromPath(path?: AbsPath | null) {
    return this.nodeFromPath(path) ?? this.nodeFromPath(absPath("/"))!;
  }

  private async initFileRenameListener() {
    /*
    Listen for file renames and update edits, thumbnails and image cache accordingly
    */
    return this.renameListener(async (pathChanges) => {
      const filePathChanges: [AbsPath, AbsPath][] = RenameDetailsToChangeSet(pathChanges, this.nodeFromPath);
      if (filePathChanges.length > 0) {
        await this.adjustThumbAndCachePaths(filePathChanges);
        await this.renameMdImages(filePathChanges);
        await HistoryDB.MoveEdits({
          workspaceId: this.id,
          changeSet: filePathChanges,
        });
      }
    });
  }

  async init({ skipListeners }: { skipListeners?: boolean } = {}) {
    try {
      const unsubs: (() => void)[] = [];
      unsubs.push(
        await this.disk.init({
          skipListeners,
        })
      );

      unsubs.push(await this.initRepo({ skipListeners }));
      if (!skipListeners) {
        unsubs.push(this.remote.init());
        unsubs.push(await this.initFileRenameListener());
        this.remote.on(WorkspaceEvents.RENAME, (payload) => this.local.emit(WorkspaceEvents.RENAME, payload));
        this.remote.on(WorkspaceEvents.DELETE, (payload) => this.local.emit(WorkspaceEvents.DELETE, payload));
      }
      if (this.tornDown) {
        //weird but totally race condition, if the workspace was torn down before the init completes
        unsubs.forEach((unsub) => unsub());
      } else {
        this.unsubs.push(...unsubs);
      }

      if (!this.connector.isOk()) {
        await this.recoverStatus();
      }
      return this;
    } catch (e) {
      console.error("Error initializing workspace", e);
      await this.connector.setStatusCode(WS_ERR_NONRECOVERABLE);
      throw e;
    }
  }
  async initNoListen() {
    return await this.init({ skipListeners: true });
  }

  async tearDown() {
    await Promise.all([this.disk.tearDown(), this.thumbs.tearDown()]);
    this.unsubs.forEach((unsub) => unsub());
    this.tornDown = true;
    this.remote.clearListeners();
    this.local.clearListeners();
    return this;
  }

  async destroy() {
    void this.local.emit(WorkspaceEvents.DELETE, { id: this.id });
    void this.remote.emit(WorkspaceEvents.DELETE, { id: this.id });
    return Promise.all([this.connector.delete(), this.imageCache.destroy()]);
  }

  async rename(name: string) {
    const newName = await this.connector.rename(WorkspaceDAO.Slugify(name));
    this.name = newName;
    void this.local.emit(WorkspaceEvents.RENAME, { id: this.id, oldName: this.name, newName });
    void this.remote.emit(WorkspaceEvents.RENAME, { id: this.id, oldName: this.name, newName });
    return newName;
  }

  home() {
    return this.href;
  }
  resolveFileUrl = (filePath: AbsPath) => {
    return joinPath(this.href, filePath);
  };

  async tryFirstFileUrl() {
    const ff = await this.getFirstFile();
    if (!ff) {
      return this.href;
    }
    return this.resolveFileUrl(ff.path);
  }

  getImages() {
    const result: AbsPath[] = [];
    this.disk.fileTree.walk((node, _depth, _exit, $stop_token) => {
      if (SpecialDirs.All.includes(node.path)) return $stop_token;
      if (isImage(node.path)) result.push(node.path);
    });
    return result;
  }

  NewScannable() {
    return new WorkspaceScannable(this.disk, { workspaceId: this.id, workspaceName: this.name });
  }

  // To get the return type of NewScannable:

  //TODO: move to service object with along with search
  async NewImage(arrayBuffer: ArrayBuffer | File, filePath: AbsPath): Promise<AbsPath> {
    const file =
      (mime.lookup(filePath) || "").startsWith("image/svg") || (mime.lookup(filePath) || "").startsWith("image/webp")
        ? new File([arrayBuffer], basename(filePath))
        : await createImage({ file: new File([arrayBuffer], basename(filePath)) });

    const fileType = getMimeType(file.name);
    if (!isImageType(fileType)) {
      throw new BadRequestError("Not a valid image, got " + fileType);
    }
    return this.newFile(dirname(filePath), relPath(file.name), new Uint8Array(await file.arrayBuffer()));
  }

  async renameMdImages(paths: [to: string, from: string][]) {
    if (paths.length === 0 || !paths.flat().length) return [];
    try {
      const { paths: resultPaths } = await SWClient["replace-files"]
        .$post({
          query: {
            workspaceName: this.name,
          },
          json: { paths },
        })
        .then((r) => r.json());

      if (resultPaths.length) {
        await this.disk.local.emit(DiskEvents.OUTSIDE_WRITE, {
          filePaths: resultPaths,
        });
      }
    } catch (e) {
      console.error(errF`Error renaming md images: ${e}`);
    }
  }

  static async UploadMultipleImages(
    files: Iterable<File>,
    targetDir: AbsPath,
    workspaceName: string,
    concurrency = 8
  ): Promise<AbsPath[]> {
    const results: AbsPath[] = [];
    let index = 0;
    const filesArr = Array.from(files);

    const uploadNext = async () => {
      if (index >= filesArr.length) return;
      const current = index++;
      const file = filesArr[current];
      await SWClient["upload-image"][":filePath{.+}"]
        .$post({
          query: {
            workspaceName,
          },
          form: {
            file: file!,
          },
          param: {
            filePath: relPath(joinPath(targetDir, file!.name)),
          },
        })
        .then(async (res) => {
          results[current] = absPath((await res.json()).path);
        })
        .catch((e) => {
          console.error("Error uploading image file:", e);
        });

      await uploadNext();
    };

    const workers = Array.from({ length: Math.min(concurrency, filesArr.length) }, () => uploadNext());
    await Promise.all(workers);
    return results;
  }

  mkdirRecursive(path: AbsPath) {
    return this.disk.mkdirRecursive(path);
  }

  dirtyListener(callback: Parameters<typeof this.disk.dirtyListener>[0]) {
    const unsub = this.disk.dirtyListener(callback);
    this.unsubs.push(unsub);
    return unsub;
  }

  getRemoteGitRepos() {
    return this.remoteAuths ?? [];
  }

  private async initRepo({ skipListeners }: { skipListeners?: boolean } = {}) {
    const unsubs: (() => void)[] = [];
    await this.repo.init({ skipListeners });
    if (skipListeners !== true) {
      unsubs.push(this.dirtyListener(debounce(() => this.repo.sync(), 500)));
      unsubs.push(
        this.repo.gitListener(() => {
          void this.disk.triggerIndex();
        })
      );
      unsubs.push(
        this.repo.gitListener(async () => {
          const { filePath: currentPath } = Workspace.parseWorkspacePath(window.location.href);
          if (await this.disk.pathExists(currentPath!)) {
            void this.disk.local.emit(DiskEvents.OUTSIDE_WRITE, {
              filePaths: [currentPath!],
            });
          } else {
            void this.disk.local.emit(DiskEvents.INDEX, {
              type: "delete",
              details: { filePaths: [currentPath!] },
            });
          }
        })
      );
      await this.repo.sync();
    }
    return () => {
      unsubs.forEach((unsub) => unsub());
      void this.repo.tearDown();
    };
  }
}
type WorkspaceJType = ReturnType<Workspace["toJSON"]>;
