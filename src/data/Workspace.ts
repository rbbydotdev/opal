import { Disk } from "@/data/disk/Disk";
import { CreateDetails, DeleteDetails, DiskEvents, IndexTrigger, RenameDetails } from "@/data/disk/DiskEvents";
import { ImageCache } from "@/data/ImageCache";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { SpecialDirs } from "@/data/SpecialDirs";
import { NamespacedThumb } from "@/data/Thumb";
import { WorkspaceDAO } from "@/data/WorkspaceDAO";
import { WorkspaceScannable } from "@/data/WorkspaceScannable";
import { GitRepo } from "@/features/git-repo/GitRepo";
import { createImage } from "@/lib/createImage";
import { debounce } from "@/lib/debounce";
import { BadRequestError } from "@/lib/errors";
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
import { DiskType } from "./DiskType";
//TODO move ww to different place
//consider using event bus, or some kind of registration or interface to seperate outside logic from main workspace logic
import { ConcurrentWorkers } from "@/data/ConcurrentWorkers";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { WS_ERR_NONRECOVERABLE } from "@/data/WorkspaceStatusCode";
import { DefaultTemplate } from "@/data/WorkspaceTemplates";
import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { Channel } from "@/lib/channel";
import { SourceDirTreeNode, SourceFileTreeNode, TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { reduceLineage } from "@/lib/paths2";
import { CreateSuperTypedEmitterClass } from "@/lib/TypeEmitter";
import { DocxConvertType } from "@/types/DocxWorkerTypes";
import * as Comlink from "comlink";
import mime from "mime-types";
import { nanoid } from "nanoid";

const WorkspaceEvents = {
  RENAME: "rename",
  DELETE: "delete",
} as const;
type RenameTrigger = { id: string; oldName: string; newName: string };
type DeleteTrigger = { id: string };
export class WorkspaceEventsRemote extends Channel<WorkspaceRemoteEventPayload> {}
export class WorkspaceEventsLocal extends CreateSuperTypedEmitterClass<WorkspaceRemoteEventPayload>() {}
export type WorkspaceRemoteEventPayload = {
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
  private remoteAuths?: RemoteAuthDAO[];
  private disk: Disk;
  private thumbs: Disk;
  private repo: GitRepo;
  private playbook: GitPlaybook;
  tornDown: boolean = false;
  local = new WorkspaceEventsLocal();
  remote: WorkspaceEventsRemote;

  private unsubs: (() => void)[] = [];

  getDisk() {
    return this.disk;
  }
  getRepo() {
    return this.repo;
  }
  getPlaybook() {
    return this.playbook;
  }
  getThumbsDisk() {
    return this.thumbs;
  }
  getRemoteAuths() {
    return this.remoteAuths ?? [];
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
    this.remoteAuths = remoteAuths || [];
    this.disk = disk;
    this.thumbs = thumbs;
    this.imageCache = Workspace.newCache(this.name);
    this.repo = GitRepo.FromDisk(this.disk, `${this.id}/repo`);
    this.playbook = new GitPlaybook(this.repo);
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

  // Deprecated: Use parseWorkspacePath instead
  // static parseWorkspacePathLegacy(pathOrUrl: string) {
  //   const result = Workspace.parseWorkspacePath(pathOrUrl);
  //   return { workspaceName: result.workspaceName, filePath: result.filePath };
  // }

  static async CreateNew(
    name: string,
    files: Record<string, string | Promise<string> | (() => string | Promise<string>)> = {},
    diskType: DiskType,
    diskOptions?: {
      selectedDirectory: FileSystemDirectoryHandle | null;
    }
  ) {
    let workspace: Workspace;
    const workspaceDAO = await WorkspaceDAO.CreateNewWithDiskType({ name, diskType });
    //TODO: make this more elegant, too much special case inside of Workspace class
    if (diskType === "OpFsDirMountDisk") {
      if (!diskOptions?.selectedDirectory) {
        throw new BadRequestError("selectedDirectory is required for OpFsDirMountDisk");
      }
      const disk = DiskFromJSON(workspaceDAO.disk) as OpFsDirMountDisk;
      await disk.setDirectoryHandle(diskOptions.selectedDirectory);
    }
    workspace = Workspace.FromDAO(workspaceDAO);
    await workspace.newFiles(
      Object.entries(files).map(([path, content]) => [
        absPath(path),
        typeof content === "function" ? content() : content,
      ])
    );

    return workspace;
  }

  static async CreateNewWithSeedFiles(name: string, diskType: DiskType) {
    return Workspace.CreateNew(name, DefaultTemplate.seedFiles, diskType);
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
    virtualContent?: string;
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

  private async adjustThumbAndCachePath(oldNode: TreeNode, newPath: AbsPath) {
    if (isImage(oldNode.path)) {
      await this.imageCache.getCache().then(async (c) => {
        const res = await c.match(oldNode.path);
        if (res) {
          await c.delete(oldNode.path);
          await c.put(newPath, res);
        }
      });
      const oldThumb = this.NewThumb(oldNode.path);
      const newThumb = this.NewThumb(newPath);
      await oldThumb.move(oldThumb.path, newThumb.path).catch(async (_e) => {
        console.warn(`error moving thumb from ${oldThumb.path} to ${newThumb.path}`);
      });
    }
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
      return [fromNode, toNode] as [TreeDir, TreeNode];
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
    const disk = this.getDisk();
    const thumbDisk = this.getThumbsDisk();
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
    const sourceNode = this.nodeFromPath(String(source));
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
    const result = await Workspace.UploadMultipleDocxsFetch(files, targetDir, concurrency);
    await this.indexAndEmitNewFiles(result);
    return result;
  }
  async uploadMultipleDocxWorkers(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    try {
      const result = await ConcurrentWorkers(
        () => Comlink.wrap<DocxConvertType>(new Worker("/docx.ww.js")),
        (worker, file) => worker.docxConvert(this, absPath(joinPath(targetDir, file!.name)), file, false),
        files,
        concurrency,
        (worker) => new Promise((rs) => setTimeout(rs, 1000)).then(worker.tearDown)
      );
      await this.indexAndEmitNewFiles(result);
      return result;
    } catch (e) {
      console.error("Error renaming md images", e);
    }
    return [];
  }

  static async UploadMultipleDocxsFetch(
    files: Iterable<File>,
    targetDir: AbsPath,
    concurrency = 8
  ): Promise<AbsPath[]> {
    const results: AbsPath[] = [];
    let index = 0;
    const filesArr = Array.from(files);

    const uploadNext = async () => {
      if (index >= filesArr.length) return;
      const current = index++;
      const file = filesArr[current];
      const res = await fetch(joinPath(absPath("/upload-docx"), targetDir, file!.name), {
        method: "POST",
        headers: {
          "Content-Type": file!.type,
        },
        body: file,
      });
      results[current] = absPath(await res.text());
      await uploadNext();
    };

    const workers = Array.from({ length: Math.min(concurrency, filesArr.length) }, () => uploadNext());
    await Promise.all(workers);
    return results;
  }

  async refreshDisk() {
    await this.disk.refresh();
  }

  async uploadMultipleImages(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    const results = await Workspace.UploadMultipleImages(files, targetDir, concurrency);
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

  nodeFromPath = (path?: AbsPath | string | null) => {
    if (path === null || path === undefined) return null;
    return this.disk.fileTree.nodeFromPath(path);
  };
  nodesFromPaths(paths: (AbsPath | string | null)[]) {
    return paths.map((path) => this.nodeFromPath(path)).filter(Boolean);
  }
  //defaults to path "/" if not found
  tryNodeFromPath(path?: AbsPath | string | null) {
    return this.nodeFromPath(path) ?? this.nodeFromPath(absPath("/"))!;
  }

  private async initImageFileListeners() {
    return this.renameListener(async (nodes) => {
      await Promise.all(
        nodes.map(({ oldPath, newPath, fileType }) =>
          this.adjustThumbAndCachePath(TreeNode.FromPath(oldPath, fileType), absPath(newPath))
        )
      );

      // Collect all file path changes for markdown replacement
      const filePathChanges: [string, string][] = [];

      for (const { oldPath, newPath, fileType } of nodes) {
        if (oldPath === newPath) continue;

        if (fileType === "file") {
          // Direct file rename - include all files that might be referenced
          filePathChanges.push([oldPath, newPath]);
        } else if (fileType === "dir") {
          // Directory rename - find all file children recursively
          const newDirNode = this.nodeFromPath(newPath);
          if (newDirNode?.isTreeDir()) {
            // Walk through all children to find all files (not just images)
            newDirNode.walk((child) => {
              if (child.isTreeFile()) {
                // Calculate what the old path would have been
                const oldFilePath = absPath(child.path.replace(newPath, oldPath));
                filePathChanges.push([oldFilePath, child.path]);
              }
            });
          }
        }
      }

      if (filePathChanges.length > 0) {
        await this.renameMdImages(filePathChanges);
      }
    });
  }

  // isReady(){
  //   return this.disk.isReady() && this.repo.isReady();
  // }

  async init({ skipListeners }: { skipListeners?: boolean } = {}) {
    try {
      const unsubs: (() => void)[] = [];
      // Store disk initialization errors to re-throw them
      // let diskInitError: Error | null = null;
      unsubs.push(
        await this.disk.init({
          skipListeners,
          // onError: (error) => {
          //   diskInitError = error;
          // },
        })
      );

      unsubs.push(await this.initRepo({ skipListeners }));
      if (!skipListeners) {
        unsubs.push(this.remote.init());
        unsubs.push(await this.initImageFileListeners());
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
      // this.setEror
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
    return this.href + filePath;
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
  // ConcurrentWorkers

  // async _____________renameMdImagesWorker(paths: [to: string, from: string][], origin = window.location.origin) {
  //   try {
  //     return await ConcurrentWorkers(
  //       () => Comlink.wrap<handleMdImageReplaceType>(new Worker("/imageReplace.ww.js")),
  //       (worker, item) => worker.handleMdImageReplace(this, origin, item, false),
  //       [paths],
  //       8,
  //       (worker) => worker.tearDown()
  //     );
  //   } catch (e) {
  //     console.error("Error renaming md images", e);
  //   }
  // }

  async renameMdImages(paths: [to: string, from: string][]) {
    if (paths.length === 0 || !paths.flat().length) return [];
    let res: AbsPath[] = [];
    // const response = await fetch("/replace-md-images", {
    const response = await fetch("/replace-files", {
      method: "POST",
      body: JSON.stringify(paths),
    });
    if (response.ok) {
      try {
        res = (await response.clone().json()) as AbsPath[];
      } catch (e) {
        console.error(`Error parsing JSON from /replace-files\n\n${await response.clone().text()}`, e);
        res = [];
      }
    } else {
      const bodyText = await response.text();
      console.error(`Error renaming md images: ${response.status} ${response.statusText}\n${bodyText}`);
      res = [];
    }
    if (res.length) {
      await this.disk.local.emit(DiskEvents.OUTSIDE_WRITE, {
        filePaths: res,
      });
    }
  }

  static async UploadMultipleImages(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    const results: AbsPath[] = [];
    let index = 0;
    const filesArr = Array.from(files);

    const uploadNext = async () => {
      if (index >= filesArr.length) return;
      const current = index++;
      const file = filesArr[current];
      const res = await fetch(joinPath(absPath("/upload-image"), targetDir, file!.name), {
        method: "POST",
        headers: {
          "Content-Type": file!.type,
        },
        body: file,
      });
      results[current] = absPath(await res.text());
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

  private async __________RepoWorker() {
    //TODO repo / repoworker should just be apart of workspace from the get go instead of being a separate thing
    //but it uses async instantiation so care is needed to make sure its torn down properly, think useAsyncEffct
    // const worker = new Worker(new URL("/src/workers/RepoWorker/repo.ww.ts", import.meta.url), { type: "module" });
    const worker = new Worker("/repo.ww.js");
    const RepoApi = Comlink.wrap<typeof GitRepo>(worker);
    this.unsubs.push(() => worker.terminate());
    const repo = await new RepoApi({
      guid: `${this.id}/repo`,
      disk: this.disk.toJSON(),
    });
    return {
      worker,
      repo,
    };
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
export type WorkspaceJType = ReturnType<Workspace["toJSON"]>;
