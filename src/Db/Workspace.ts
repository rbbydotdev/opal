import { CreateDetails, DeleteDetails, Disk, IndexTrigger, RenameDetails } from "@/Db/Disk";
import { ImageCache } from "@/Db/ImageCache";
import { ClientDb } from "@/Db/instance";
import { Thumb } from "@/Db/Thumb";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { SearchScannable } from "@/features/SearchScan";
import { BadRequestError } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, absPath, decodePath, encodePath, isImage, joinPath, RelPath, relPath } from "@/lib/paths2";
import { nanoid } from "nanoid";
import { TreeDir, TreeNode } from "../lib/FileTree/TreeNode";
import { RemoteAuth } from "./RemoteAuth";

/*


Workspace_Dao
  Disk_Dao
  Thumbs_Dao
  Remote_auth_Dao


  Workspace_Dao_FromJSON - guid
    Disk_DAO - guid, type
    Remote_auth_DAO - guid
    Thumbs_DAO - guid


*/

//TODO: change the mututation of this class to instead have a database tied object, but when othere deps are loaded it beomces a different object
//for exampple the diskguid
export type WorkspaceJType = ReturnType<Workspace["toJSON"]>;
export class Workspace {
  imageCache: ImageCache;
  memid = nanoid();
  isNull = false;
  static seedFiles: Record<string, string> = {
    "/welcome.md": "# Welcome to your new workspace!",
    "/home/drafts/post1.md": "# Hello World!",
    "/drafts/draft1.md": "# Goodbye World!",
    "/ideas/ideas.md": "# Foobar bizz bazz",
    "/lorems-ipsum.md": `
    # Lorem Ipsum Lorem needle ipsum dolor sit amet, 
    consectetur adipiscing needle elit. Sed do eiusmod tempor
    incididunt ut labore et dolore magna aliqua. Ut enim
    ad minim veniam, quis needle nostrud exercitation ullamco
    laboris nisi ut aliquip ex ea commodo consequat.`,
  };

  static newCache(id: string) {
    return new ImageCache({ guid: id, name: "img" });
  }

  name: string;
  guid: string;
  remoteAuth: RemoteAuth;
  disk: Disk;
  thumbs: Disk;

  constructor(
    {
      name,
      guid,
      disk,
      thumbs,
      remoteAuth,
    }: {
      name: string;
      guid: string;
      disk: Disk;
      thumbs: Disk;
      remoteAuth: RemoteAuth;
    },
    private connector: WorkspaceDAO
  ) {
    this.name = WorkspaceDAO.Slugify(name);
    this.guid = guid;
    this.remoteAuth = remoteAuth;
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
    return `${WorkspaceDAO.rootRoute}/${this.name}`;
  }
  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      remoteAuth: this.remoteAuth.toJSON(),
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
        remoteAuth: RemoteAuth.FromJSON(json.remoteAuth),
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

  static parseWorkspacePath(pathname: string) {
    if (!pathname.startsWith(WorkspaceDAO.rootRoute)) return { workspaceId: null, filePath: null };
    const [workspaceId, ...filePathRest] = decodePath(relPath(pathname.replace(WorkspaceDAO.rootRoute, ""))).split("/");
    const filePath = filePathRest.join("/");
    if (!workspaceId) {
      return { workspaceId: null, filePath: null };
    }
    return { workspaceId, filePath: filePath ? absPath(filePath) : undefined };
  }

  static async CreateNew(name: string, files: Record<string, string> = {}) {
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
  newFile(dirPath: AbsPath, newFileName: RelPath, content: string | Uint8Array = ""): Promise<AbsPath> {
    return this.disk.newFile(joinPath(dirPath, newFileName), content);
  }
  newFiles(files: [AbsPath, string | Uint8Array][]) {
    return this.disk.newFiles(files);
  }

  addVirtualFile({ type, name }: { type: TreeNode["type"]; name: TreeNode["name"] }, selectedNode: TreeNode | null) {
    return this.disk.addVirtualFile({ type, name }, selectedNode);
  }
  removeVirtualfile(path: AbsPath) {
    return this.disk.removeVirtualFile(path);
  }
  removeMultipleFiles = async (filePaths: AbsPath[]) => {
    await Promise.all(
      filePaths.filter(isImage).flatMap((imagePath) => [
        this.NewThumb(imagePath)
          .remove()
          .catch((e) => {
            console.error(e);
          }),
        this.imageCache.getCache().then((c) => c.delete(encodePath(imagePath))),
      ])
    );
    return this.disk.removeMultipleFiles(filePaths);
  };
  removeFile = async (filePath: AbsPath) => {
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
  };

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
        .catch(async (e) => {
          console.error("Error moving thumb", e);
        });
    }
  }
  renameMultiple = async (nodes: [from: TreeNode, to: TreeNode | AbsPath][]) => {
    const result = await this.disk.renameMultiple(nodes);
    await this.disk.findReplaceImgBatch(
      result
        .filter(({ oldPath, newPath, fileType }) => oldPath !== newPath && fileType === "file" && isImage(oldPath))
        .map(({ oldPath, newPath }) => [oldPath, newPath])
    );
    return result;
  };
  renameFile = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const nextPath = await this.disk.nextPath(newFullPath); // Set the next path to the new full path
    const { newPath } = await this.disk.renameDir(oldNode.path, nextPath);
    const newNode = oldNode.copy().rename(newPath);

    await this.disk.findReplaceImgBatch([[oldNode.path, absPath(oldNode.path.replace(oldNode.path, newNode.path))]]); // Update all references in the disk
    await this.adjustThumbAndCachePath(oldNode, absPath(oldNode.path.replace(oldNode.path, newNode.path)));
    return newNode;
  };
  //this is dumb because you do not consider the children!
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
    await this.disk.findReplaceImgBatch(findStrReplaceStr);

    return newNode;
  };
  readFile = (filePath: AbsPath) => {
    return this.disk.readFile(filePath);
  };

  watchDisk(callback: (fileTree: TreeDir, trigger?: IndexTrigger | void) => void) {
    return this.disk.latestIndexListener(callback);
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
  async dropImageFile(file: File, targetPath: AbsPath) {
    const fileType = getMimeType(file.name);
    if (!isImageType(fileType)) {
      throw new BadRequestError("Not a valid image");
    }
    return this.newFile(targetPath, relPath(file.name), new Uint8Array(await file.arrayBuffer()));
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

  nodeFromPath(path: AbsPath | string | null) {
    if (path === null) return null;
    return this.disk.fileTree.nodeFromPath(path);
  }

  async init() {
    await this.disk.init();
    return this;
  }

  tearDown = async () => {
    await Promise.all([this.disk.tearDown(), this.thumbs.tearDown()]);
    return this;
  };

  delete = async () => {
    return Promise.all([
      await this.disk.tearDown(),
      ClientDb.workspaces.delete(this.guid),
      this.disk.delete(),
      this.thumbs.delete(),
      this.imageCache.delete(),
    ]);
  };

  home = () => {
    return this.href;
  };
  resolveFileUrl = (filePath: AbsPath) => {
    return this.href + encodePath(filePath);
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
    return new SearchScannable(this.disk);
  }
}
