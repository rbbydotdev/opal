"use client";
import { CreateDetails, DeleteDetails, Disk, DiskEvents, IndexTrigger, RenameDetails } from "@/Db/Disk";
import { HistoryDAO } from "@/Db/HistoryDAO";
import { ImageCache } from "@/Db/ImageCache";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { SpecialDirs } from "@/Db/SpecialDirs";
import { Thumb } from "@/Db/Thumb";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WorkspaceScannable } from "@/Db/WorkspaceScannable";
import { WorkspaceSeedFiles } from "@/Db/WorkspaceSeedFiles";
import { createImage } from "@/lib/createImage";
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
  encodePath,
  isImage,
  joinPath,
  RelPath,
  relPath,
  resolveFromRoot,
} from "@/lib/paths2";
import mime from "mime-types";
import { nanoid } from "nanoid";
import { TreeDir, TreeNode } from "../lib/FileTree/TreeNode";
import { reduceLineage } from "../lib/paths2";
export type WorkspaceJType = ReturnType<Workspace["toJSON"]>;

// type DiskScan = UnwrapScannable<Disk>;
export class Workspace {
  imageCache: ImageCache;
  memid = nanoid();
  isNull = false;
  static seedFiles = WorkspaceSeedFiles;

  static newCache(id: string) {
    return new ImageCache({ guid: id, name: "img" });
  }

  name: string;
  guid: string;
  remoteAuths?: RemoteAuthDAO[];
  disk: Disk;
  thumbs: Disk;

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
  }

  get id() {
    return this.guid;
  }

  static async DeleteAll() {
    const workspaces = await WorkspaceDAO.all();
    return Promise.all(workspaces.map((workspace) => workspace.toModel().delete()));
  }

  get href() {
    return joinPath(WorkspaceDAO.rootRoute, this.name);
    // return `${WorkspaceDAO.rootRoute}/${this.name}` as AbsPath;
  }
  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      remoteAuths: (this.remoteAuths ?? []).map((ra) => ra.toJSON()),
      disk: this.disk.toJSON(),
      thumbs: this.thumbs.toJSON(),
    };
  }
  static FromJSON(json: WorkspaceJType) {
    const connector = WorkspaceDAO.FromJSON(json);
    return new Workspace(
      {
        name: json.name,
        guid: json.guid,
        disk: Disk.FromJSON(json.disk),
        thumbs: Disk.FromJSON(json.thumbs),
        remoteAuths: json.remoteAuths.map((ra) => RemoteAuthDAO.FromJSON(ra)),
      },
      connector
    );
  }

  NewThumb(path: AbsPath, size = 100) {
    return new Thumb(this.imageCache.getCache(), this.thumbs, this.disk, path, null, size);
  }

  async readOrMakeThumb(path: AbsPath | string, size = 100) {
    const thumb = this.NewThumb(absPath(path), size);
    return thumb.readOrMake();
  }

  static parseWorkspacePath(pathOrUrl: string) {
    const url = new URL(pathOrUrl, "http://example");
    const pathname = absPathname(url.pathname);

    let workspaceId: string | null = null;
    let filePath: AbsPath | undefined | null = null;

    if (WorkspaceDAO.Routes.some((route) => pathname.startsWith(route))) {
      const [id, ...filePathRest] = decodePath(
        relPath(WorkspaceDAO.Routes.reduce((prev, next) => prev.replace(next, ""), String(pathname)))
      ).split("/");
      workspaceId = id || null;
      filePath = filePathRest.length ? absPath(filePathRest.join("/")) : undefined;
    }

    // Try search params if not found
    if (!workspaceId) {
      workspaceId = url.searchParams.get("workspaceId");
    }
    if (!filePath) {
      const fp = url.searchParams.get("filePath");
      filePath = fp ? absPath(fp) : null;
    }

    return { workspaceId, filePath };
  }

  static async CreateNew(name: string, files: Record<string, string | Promise<string>> = {}) {
    const workspace = (await WorkspaceDAO.CreateNew(name)).toModel();
    await workspace.newFiles(Object.entries(files).map(([path, content]) => [absPath(path), content]));
    return workspace;
  }

  static async CreateNewWithSeedFiles(name: string) {
    return Workspace.CreateNew(name, Workspace.seedFiles);
  }

  replaceUrlPath(pathname: string, oldPath: AbsPath, newPath: AbsPath) {
    const { filePath } = Workspace.parseWorkspacePath(pathname);
    if (!filePath) return pathname;
    return this.resolveFileUrl(absPath(filePath.replace(oldPath, newPath)));
  }

  newDir(dirPath: AbsPath, newDirName: RelPath) {
    return this.disk.newDir(joinPath(dirPath, newDirName));
  }
  //this func sig is wack
  newFile(dirPath: AbsPath, newFileName: RelPath, content: string | Blob | Uint8Array = ""): Promise<AbsPath> {
    // return this.disk.newFiles(files);
    return this.disk.newFile(joinPath(dirPath, newFileName), content);
  }
  newFiles<T extends string | Uint8Array | Blob>(files: [name: AbsPath, content: T | Promise<T>][]) {
    return this.disk.newFiles(files);
  }

  addVirtualFile({ type, name }: Pick<TreeNode, "type" | "name">, selectedNode: TreeNode | null) {
    return this.disk.addVirtualFile({ type, name }, selectedNode);
  }

  addVirtualFileFromSource(
    { type, name, sourceNode }: Pick<TreeNode, "type" | "name"> & { sourceNode: TreeNode },
    parentNode: TreeNode | null
  ) {
    return this.disk.addVirtualFileFromSource({ type, name, sourceNode }, parentNode);
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
        this.imageCache.getCache().then((c) => c.delete(encodePath(imagePath))),
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
        this.imageCache.getCache().then((c) => c.delete(encodePath(filePath))),
      ]);
    }
    return this.disk.removeFile(filePath);
  }

  private async adjustThumbAndCachePath(oldNode: TreeNode, newPath: AbsPath) {
    if (isImage(oldNode.path)) {
      await this.imageCache.getCache().then(async (c) => {
        const res = await c.match(encodePath(oldNode.path));
        if (res) {
          await c.delete(encodePath(oldNode.path));
          await c.put(encodePath(newPath), res);
        }
      });
      await this.NewThumb(oldNode.path)
        .move(oldNode.path, newPath)
        .catch(async (_e) => {
          console.debug(`error moving thumb from ${oldNode.path} to ${newPath}`);
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

  renameDir = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { newPath } = await this.disk.renameDir(oldNode.path, newFullPath).catch((e) => {
      console.error("Error renaming dir", e);
      throw e;
    });
    const newNode = oldNode.copy().rename(newPath);

    const findStrReplaceStr: [string, string][] = [];

    await newNode.asyncWalk(async (child) => {
      findStrReplaceStr.push([child.path, absPath(child.path.replace(oldNode.path, newNode.path))]);
      await this.adjustThumbAndCachePath(child, absPath(child.path.replace(oldNode.path, newNode.path)));
    });
    await this.renameMdImages(findStrReplaceStr);

    return newNode;
  };
  readFile = (filePath: AbsPath) => {
    return this.disk.readFile(filePath);
  };

  watchDisk(callback: (fileTree: TreeDir, trigger?: IndexTrigger | void) => void) {
    return this.disk.latestIndexListener(callback);
  }
  copyMultipleFiles(copyNodes: [from: TreeNode, to: AbsPath | TreeNode][]) {
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

  renameListener(callback: (details: RenameDetails[]) => void) {
    return this.disk.renameListener(callback);
  }

  createListener(callback: (details: CreateDetails) => void) {
    return this.disk.createListener(callback);
  }

  deleteListener(callback: (details: DeleteDetails) => void) {
    return this.disk.deleteListener(callback);
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
    const results = await Workspace.UploadMultipleDocxs(files, targetDir, concurrency);
    await this.indexAndEmitNewFiles(results);
    return results;
  }

  async rehydrateIndexCache() {
    await this.disk.rehydrateIndexCache();
  }

  async uploadMultipleImages(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
    const results = await Workspace.UploadMultipleImages(files, targetDir, concurrency);
    await this.indexAndEmitNewFiles(results);
    return results;
  }

  indexAndEmitNewFiles(files: AbsPath[]) {
    return this.disk.indexAndEmitNewFiles(files);
  }

  getFileTreeRoot() {
    return this.disk.fileTree.root;
  }
  getFlatTree(filter?: (node: TreeNode) => boolean) {
    if (filter) {
      return this.disk.fileTree
        .all()
        .filter(filter)
        .map((node) => node.path);
    }
    return this.disk.fileTree.all().map((node) => node.path);
  }

  nodeFromPath(path?: AbsPath | string | null) {
    if (path === null || path === undefined) return null;
    return this.disk.fileTree.nodeFromPath(path);
  }
  nodesFromPaths(paths: (AbsPath | string | null)[]) {
    return paths.map((path) => this.nodeFromPath(path)).filter(Boolean);
  }
  //defaults to path "/" if not found
  tryNodeFromPath(path?: AbsPath | string | null) {
    return this.nodeFromPath(path) ?? this.nodeFromPath(absPath("/"))!;
  }

  private async initImageFileListeners() {
    this.renameListener(async (nodes) => {
      await Promise.all(
        nodes.map(({ oldPath, newPath, fileType }) =>
          this.adjustThumbAndCachePath(TreeNode.FromPath(oldPath, fileType), absPath(newPath.replace(oldPath, newPath)))
        )
      );
      await this.renameMdImages(
        nodes
          .filter(({ oldPath, newPath, fileType }) => oldPath !== newPath && fileType === "file" && isImage(oldPath))
          .map(({ oldPath, newPath }) => [oldPath, newPath])
      );
    });
  }

  async init({ skipListeners }: { skipListeners?: boolean } = {}) {
    await this.disk.init({ skipListeners });
    if (!skipListeners) await this.initImageFileListeners();
    return this;
  }
  async initNoListen() {
    return this.init({ skipListeners: true });
  }

  async tearDown() {
    await Promise.all([this.disk.tearDown(), this.thumbs.tearDown()]);
    return this;
  }

  async delete() {
    return Promise.all([
      HistoryDAO.removeAllForWorkspaceId(this.id),
      this.disk.tearDown(),
      this.connector.delete(),
      this.disk.delete(),
      this.thumbs.delete(),
      this.imageCache.delete(),
    ]);
  }

  home() {
    return this.href;
  }
  resolveFileUrl = (filePath: AbsPath) => {
    return this.href + encodePath(filePath);
  };
  // ?viewMode=source
  resolveEditorFileUrl = (filePath: AbsPath) => {
    //get mime type
    const mimeType = getMimeType(filePath);
    if (mimeType.startsWith("image/")) {
      return this.resolveFileUrl(filePath);
    }
    if (mimeType.startsWith("text/markdown")) {
      return this.resolveFileUrl(filePath); /* + "?viewMode=rich-text" rich text is default */
    }
    return this.resolveFileUrl(filePath) + "?viewMode=source";
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
    this.disk.fileTree.walk((node) => {
      if (isImage(node.path)) {
        result.push(node.path);
      }
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
    let res: AbsPath[] = [];
    const response = await fetch("/replace-md-images", {
      method: "POST",
      body: JSON.stringify(paths),
    });
    if (response.ok) {
      try {
        res = (await response.clone().json()) as AbsPath[];
      } catch (e) {
        console.error(`Error parsing JSON from /replace-md-images\n\n${await response.clone().text()}`, e);
        res = [];
      }
    } else {
      const bodyText = await response.text();
      console.error(`Error renaming md images: ${response.status} ${response.statusText}\n${bodyText}`);
      res = [];
    }
    if (res.length) {
      await this.disk.local.emit(DiskEvents.WRITE, {
        filePaths: res,
      });
    }
  }

  static async UploadMultipleDocxs(files: Iterable<File>, targetDir: AbsPath, concurrency = 8): Promise<AbsPath[]> {
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
    //TODO: leaking concerns
    // await this.disk.hydrateIndexFromDisk();
    //TODO: i dont think i need this
    return results;
  }

  mkdirRecursive(path: AbsPath) {
    return this.disk.mkdirRecursive(path);
  }

  async transferFiles(
    transferNodes: [from: TreeNode, to: AbsPath][],
    fromWorkspaceName: string,
    toWorkspace: Workspace
  ) {
    const fromWs = await WorkspaceDAO.FetchByName(fromWorkspaceName).then((ws) => ws.toModel().initNoListen());
    return await Disk.TransferFiles(transferNodes, fromWs.disk, toWorkspace.disk);
  }

  NewRepo() {
    return this.disk.NewGitRepo();
  }

  // addRemote

  getRemoteGitRepos() {
    return this.remoteAuths ?? [];
  }
}
