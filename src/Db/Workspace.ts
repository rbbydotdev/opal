"use client";
import { Disk, DiskDAO, DiskJType, IndexedDbDisk, NullDisk, OpFsDisk } from "@/Db/Disk";
import { ClientDb } from "@/Db/instance";
import { WorkspaceRecord } from "@/Db/WorkspaceRecord";
import { createThumbnailWW } from "@/lib/createThumbnailWW";
import { BadRequestError, errF, NotFoundError } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { absPath, AbsPath, isAncestor, relPath, RelPath } from "@/lib/paths";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { TreeDir, TreeNode } from "../lib/FileTree/TreeNode";
import { NullRemoteAuth, RemoteAuth, RemoteAuthDAO, RemoteAuthJType } from "./RemoteAuth";

export class Thumb {
  constructor(
    public cache: Promise<Cache>,
    public thumbRepo: Disk,
    public imgRepo: Disk,
    public path: AbsPath,
    public content: Uint8Array | null = null,
    public size = 100
  ) {}

  static isThumbURL(url: string | URL) {
    if (typeof url === "string") {
      try {
        url = new URL(url);
      } catch (_e) {
        return false;
      }
    }
    return url.searchParams.has("thumb");
  }
  async save() {
    await this.thumbRepo.writeFileRecursive(this.path, this.content!);
    return this;
  }

  // toFilename(){
  //   return absPath(`${this.path.dirname().join(this.path.prefix())}.${this.size}${this.path.extname()}`);
  // }

  async readOrMake() {
    if (await this.exists()) {
      return this.read();
    }
    return (await this.make()).read();
  }

  async make() {
    const content = await this.imgRepo.readFile(this.path);
    if (!content) throw new NotFoundError("Image not found for thumb" + this.path);
    this.content = await createThumbnailWW(content as Uint8Array, this.size, this.size);
    await this.save();
    return this;
  }

  exists() {
    return this.thumbRepo.pathExists(this.path);
  }
  async read() {
    return this.content || (this.content = (await this.thumbRepo.readFile(this.path)) as Uint8Array);
  }

  url() {
    return this.path.urlSafe() + "?thumb=" + this.size;
  }

  async move(oldPath: AbsPath, newPath: AbsPath) {
    const oldUrl = this.url();
    this.path = newPath;
    await this.cache.then(async (c) => {
      const res = await c.match(oldUrl);
      if (res) {
        await c.put(this.url(), res);
        await c.delete(oldUrl);
      }
    });
    await this.thumbRepo.mkdirRecursive(newPath.dirname());
    return this.thumbRepo.renameDirOrFile(oldPath, newPath);
  }

  async remove() {
    await this.cache.then((c) => c.delete(this.url()));
    await this.thumbRepo.removeFile(this.path);
  }
}
export class WorkspaceDAO implements WorkspaceRecord {
  // static rootRoute = "/workspace";
  static guid = () => "__workspace__" + nanoid();

  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  createdAt!: Date;
  remoteAuth!: RemoteAuthJType;
  RemoteAuth?: RemoteAuthDAO;
  Disk?: DiskDAO;
  Thumbs?: DiskDAO;

  static fromJSON(json: WorkspaceRecord) {
    return new WorkspaceDAO(json);
  }

  static async allRecords() {
    return ClientDb.workspaces.toArray();
  }
  get href() {
    return `${Workspace.rootRoute}/${this.name}`;
  }
  static async all() {
    const workspaceRecords = await ClientDb.workspaces.toArray();
    return workspaceRecords.map((ws) => new WorkspaceDAO(ws));
  }
  static async nameExists(name: string) {
    const result = await WorkspaceDAO.fetchFromName(name, {
      throwNotFound: false,
    });
    return result !== null;
  }

  save = async () => {
    return ClientDb.workspaces.put({
      guid: this.guid,
      name: this.name,
      disk: this.disk,
      remoteAuth: this.remoteAuth,
      thumbs: this.thumbs,
      createdAt: this.createdAt,
    });
  };
  static async create(
    name: string,
    remoteAuth: RemoteAuthDAO = RemoteAuthDAO.new(),
    // disk: DiskDAO = DiskDAO.new(OpFsDisk.type),
    // thumbs: DiskDAO = DiskDAO.new(OpFsDisk.type)
    disk: DiskDAO = DiskDAO.new(IndexedDbDisk.type),
    thumbs: DiskDAO = DiskDAO.new(IndexedDbDisk.type)
  ) {
    let uniqueName = WorkspaceDAO.Slugify(name);
    let inc = 0;
    while (await WorkspaceDAO.nameExists(uniqueName)) {
      uniqueName = `${name}-${++inc}`;
    }
    const workspace = new WorkspaceDAO({
      name: uniqueName,
      guid: WorkspaceDAO.guid(),
      disk: disk.toJSON(),
      thumbs: thumbs.toJSON(),
      remoteAuth: remoteAuth.toJSON(),
      createdAt: new Date(),
    });
    await ClientDb.transaction("rw", ClientDb.disks, ClientDb.remoteAuths, ClientDb.workspaces, async () => {
      return await Promise.all([disk.save(), thumbs.save(), remoteAuth.save(), workspace.save()]);
    });

    return new Workspace({ ...workspace, remoteAuth, disk, thumbs });
  }
  static async byName(name: string) {
    const ws = await ClientDb.workspaces.where("name").equals(name).first();
    if (!ws) throw new NotFoundError("Workspace not found");
    return new WorkspaceDAO(ws);
  }
  static async byGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError("Workspace not found");

    const wsd = new WorkspaceDAO(ws);

    const [auth, disk, thumbs] = await Promise.all([wsd.getRemoteAuth(), wsd.getDisk(), wsd.getThumbs()]);

    return new Workspace({ ...wsd, remoteAuth: auth, disk, thumbs });
  }
  async withRelations() {
    const [auth, disk] = await Promise.all([this.getRemoteAuth(), this.getDisk()]);
    this.RemoteAuth = auth;
    this.Disk = disk;
    return this;
  }
  static Slugify(name: string) {
    return slugify(name, { strict: true });
  }
  async toModel() {
    const [auth, disk, thumbs] = await Promise.all([
      this.RemoteAuth ? Promise.resolve(this.RemoteAuth) : this.getRemoteAuth(),
      this.Disk ? Promise.resolve(this.Disk) : this.getDisk(),
      this.Thumbs ? Promise.resolve(this.Thumbs) : this.getThumbs(),
    ]);
    return new Workspace({ ...this, remoteAuth: auth, disk, thumbs });
  }

  private async getRemoteAuth() {
    const remoteAuth = await ClientDb.remoteAuths.where("guid").equals(this.remoteAuth.guid).first();
    if (!remoteAuth) throw new NotFoundError("RemoteAuth not found");
    return new RemoteAuthDAO(remoteAuth);
  }

  async getDisk() {
    const disk = await ClientDb.disks.where("guid").equals(this.disk.guid).first();

    if (!disk) throw new NotFoundError("Disk not found");
    return new DiskDAO(disk);
  }

  async getThumbs() {
    const thumbs = await ClientDb.disks.where("guid").equals(this.thumbs.guid).first();

    if (!thumbs) throw new NotFoundError("Thumbs not found");
    return new DiskDAO(thumbs);
  }

  static async fetchFromRoute(route: string) {
    if (!isAncestor(route, Workspace.rootRoute)) throw new BadRequestError("Invalid route " + route);

    const name = route.slice(Workspace.rootRoute.length + 1).split("/")[0];

    const ws =
      (await ClientDb.workspaces.where("name").equals(name).first()) ??
      (await ClientDb.workspaces.where("guid").equals(name).first());
    if (!ws) throw new NotFoundError(errF`Workspace not found name:${name}, guid:${name}`);
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }
  static async fetchFromGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError(errF`Workspace not found guid:${guid}`);
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }
  static async fetchFromName(name: string): Promise<Workspace>;
  static async fetchFromName(name: string, options: { throwNotFound: boolean }): Promise<Workspace | null>;
  static async fetchFromName(
    name: string,
    options: { throwNotFound: boolean } = { throwNotFound: true }
  ): Promise<Workspace | null> {
    const ws = await ClientDb.workspaces.where("name").equals(name).first();
    if (!ws) {
      if (!options.throwNotFound) return null;
      throw new NotFoundError(errF`Workspace not found name:${name}`);
    }
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }

  static async fetchFromGuidAndInit(guid: string) {
    return (await WorkspaceDAO.fetchFromGuid(guid)).init();
  }
  static async fetchFromNameAndInit(name: string) {
    return (await WorkspaceDAO.fetchFromName(name)).init();
  }

  static async fetchFromRouteAndInit(route: string) {
    return (await WorkspaceDAO.fetchFromRoute(route)).init();
  }

  constructor(properties: WorkspaceRecord) {
    Object.assign(this, properties);
  }
}

class ImageCache {
  name: string;
  guid: string;
  _cache: Promise<Cache> | null = null;
  constructor({ guid, name }: { guid: string; name: string }) {
    this.guid = guid;
    this.name = name;
  }
  private getCacheId = () => `${this.guid}/${this.name}`;
  static getCacheId(id: string) {
    return `${id}/${this.name}`;
  }
  static getCache(id: string) {
    return caches.open(this.getCacheId(id));
  }
  getCache() {
    return (this._cache ??= ImageCache.getCache(this.getCacheId()));
  }
  tearDown = async () => {
    await caches.delete(this.getCacheId());
  };
}

//TODO: change the mututation of this class to instead have a database tied object, but when othere deps are loaded it beomces a different object
//for exampple the diskguid
export class Workspace extends WorkspaceDAO {
  // export class Workspace implements WorkspaceRecord {
  imageCache: ImageCache;
  memid = nanoid();
  static seedFiles: Record<string, string> = {
    "/welcome.md": "# Welcome to your new workspace!",
    "/home/drafts/post1.md": "# Hello World!",
    "/drafts/draft1.md": "# Goodbye World!",
    "/ideas/ideas.md": "# Red Green Blue",
  };

  static newCache(id: string) {
    return new ImageCache({ guid: id, name: "img" });
  }

  createdAt: Date = new Date();
  name: string;
  guid: string;
  remoteAuth: RemoteAuth;
  disk: Disk;
  thumbs: Disk;
  _cache: Promise<Cache> | null = null;

  constructor({
    name,
    guid,
    disk,
    thumbs,
    remoteAuth,
  }: {
    name: string;
    guid: string;
    disk: DiskDAO;
    thumbs: DiskDAO;
    remoteAuth: RemoteAuthDAO;
  }) {
    super({
      name,
      guid,
      disk: disk.toJSON(),
      thumbs: thumbs.toJSON(),
      remoteAuth: remoteAuth.toJSON(),
      createdAt: new Date(),
    });
    this.name = Workspace.Slugify(name);
    this.guid = guid;
    this.remoteAuth = remoteAuth instanceof RemoteAuthDAO ? remoteAuth.toModel() : remoteAuth;
    this.disk = disk instanceof DiskDAO ? disk.toModel() : disk;
    this.thumbs = thumbs instanceof DiskDAO ? thumbs.toModel() : thumbs;
    this.imageCache = Workspace.newCache(this.name);
  }

  get id() {
    return this.guid;
  }

  static async DeleteAll() {
    const workspaces = await Workspace.all();
    await Promise.all(workspaces.map(async (ws) => (await ws.toModel()).delete()));
  }

  NewThumb(path: AbsPath, size = 100) {
    return new Thumb(this.imageCache.getCache(), this.thumbs, this.disk, path, null, size);
  }

  async readOrMakeThumb(path: AbsPath | string, size = 100) {
    path = absPath(path);
    const thumb = this.NewThumb(path, size);
    return thumb.readOrMake();
  }

  static parseWorkspacePath(pathname: string) {
    if (!pathname.startsWith(Workspace.rootRoute)) return { workspaceId: null, filePath: null };
    const [workspaceId, ...filePathRest] = relPath(pathname.replace(this.rootRoute, "")).decode().split("/");
    const filePath = filePathRest.join("/");
    if (!workspaceId) {
      return { workspaceId: null, filePath: null };
    }
    return { workspaceId, filePath: filePath ? absPath(filePath) : undefined };
  }
  static async createWithSeedFiles(name: string) {
    const ws = await WorkspaceDAO.create(name);
    await ws.disk.ready;
    await Promise.all(
      Object.entries(Workspace.seedFiles).map(([filePath, content]) =>
        ws.disk.writeFileRecursive(absPath(filePath), content)
      )
    );
    return ws;
  }

  replaceUrlPath(pathname: string, oldPath: AbsPath, newPath: AbsPath) {
    const { filePath } = Workspace.parseWorkspacePath(pathname);
    if (!filePath) return pathname;
    return this.resolveFileUrl(absPath(filePath.replace(oldPath.str, newPath.str)));
  }

  newDir(dirPath: AbsPath, newDirName: RelPath) {
    return this.disk.newDir(dirPath.join(newDirName));
  }
  newFile(dirPath: AbsPath, newFileName: RelPath, content: string | Uint8Array = ""): Promise<AbsPath> {
    return this.disk.newFile(dirPath.join(newFileName), content);
  }

  addVirtualFile({ type, name }: { type: TreeNode["type"]; name: TreeNode["name"] }, selectedNode: TreeNode | null) {
    return this.disk.addVirtualFile({ type, name }, selectedNode);
  }
  removeVirtualfile(path: AbsPath) {
    return this.disk.removeVirtualFile(path);
  }
  removeFile = async (filePath: AbsPath) => {
    if (filePath.isImage()) {
      await Promise.all([
        this.NewThumb(filePath)
          .remove()
          .catch(() => {
            /*swallow*/
          }),
        this.imageCache.getCache().then((c) => c.delete(filePath.urlSafe())),
      ]);
    }
    return this.disk.removeFile(filePath);
  };

  renameFile = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const nextPath = await this.disk.nextPath(newFullPath); // Set the next path to the new full path
    if (oldNode.path.isImage()) {
      await this.imageCache.getCache().then(async (c) => {
        const res = await c.match(oldNode.path.urlSafe());
        if (res) {
          await c.delete(oldNode.path.urlSafe());
          await c.put(nextPath.urlSafe(), res);
        }
      });
      await this.NewThumb(oldNode.path)
        .move(oldNode.path, nextPath)
        .catch(async (e) => {
          console.error("Error moving thumb", e);
        });
    }
    const { newPath } = await this.disk.renameDirOrFile(oldNode.path, nextPath);
    const newNode = oldNode.copy().rename(newPath);
    this.disk.fileTree.replaceNode(oldNode, newNode);
    return newNode;
  };
  renameDir = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { newPath } = await this.disk.renameDir(oldNode.path, newFullPath);
    const newNode = oldNode.copy().rename(newPath);
    this.disk.fileTree.replaceNode(oldNode, newNode);
    return newNode;
  };
  readFile = (filePath: AbsPath) => {
    return this.disk.readFile(filePath);
  };

  readThumb = (filePath: AbsPath) => {
    return this.thumbs.readFile(filePath);
  };

  onInitialIndex(callback: (fileTree: TreeDir) => void) {
    return this.disk.initialIndexListener(callback);
  }
  watchDisk(callback: (fileTree: TreeDir) => void, { initialTrigger = true }: { initialTrigger?: boolean } = {}) {
    return this.disk.latestIndexListener(callback, { initialTrigger });
  }

  async getFirstFile() {
    //TODO dont you need to make sure its indexed first?
    await this.disk.awaitFirstIndex();
    return this.disk.getFirstFile();
  }
  async awaitFirstIndex() {
    return this.disk.awaitFirstIndex();
  }
  async dropImageFile(file: File, targetPath: AbsPath) {
    const fileType = getMimeType(file.name); //getFileType(new Uint8Array(await file.arrayBuffer()));
    if (!isImageType(fileType)) {
      throw new BadRequestError("Not a valid image");
    }
    return this.newFile(targetPath, relPath(file.name), new Uint8Array(await file.arrayBuffer()));
  }

  getFileTreeRoot() {
    return this.disk.fileTree.root;
  }
  getFlatDirTree() {
    return this.disk.fileTree.dirs;
  }
  nodeFromPath(path: AbsPath | string | null) {
    if (path === null) return null;
    return this.disk.fileTree.nodeFromPath(path);
  }

  static rootRoute = "/workspace";

  async init() {
    await this.disk.init();
    return this;
  }

  teardown = () => {
    this.disk.teardown();
    this.thumbs.teardown();
  };

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      createdAt: this.createdAt,
      remoteAuth: this.remoteAuth.toJSON(),
      disk: this.disk.toJSON(),
      thumbs: this.thumbs.toJSON(),
    } satisfies WorkspaceRecord & { href: string };
  }

  delete = async () => {
    await ClientDb.transaction("rw", ClientDb.workspaces, ClientDb.disks, async () => {
      await Promise.all([
        ClientDb.workspaces.delete(this.guid),
        this.disk.teardown(),
        this.disk.delete(),
        this.thumbs.delete(),
      ]);
    });
    await this.imageCache.tearDown();
  };

  home = () => {
    return this.href;
  };
  resolveFileUrl = (filePath: AbsPath) => {
    return this.href + filePath.urlSafe();
  };
  subRoute = (path: string) => {
    return `${this.href.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  };
  async tryFirstFileUrl() {
    const ff = await this.getFirstFile();
    if (!ff) return this.href;
    return this.resolveFileUrl(ff.path);
  }

  getImages() {
    const result: AbsPath[] = [];
    // await this.disk.initialIndexListener(() => {});
    this.disk.fileTree.walk((node) => {
      if (node.path.isImage()) {
        result.push(node.path);
      }
    });
    return result;
  }

  get isIndexed() {
    return this.disk.isIndexed;
  }
  get href() {
    return `${Workspace.rootRoute}/${this.name}`;
  }
  isNull = false;
}

export class NullWorkspace extends Workspace {
  async init() {
    return this;
  }
  isNull = true;
  constructor() {
    super({
      name: "",
      guid: "",
      disk: new NullDisk(),
      remoteAuth: new NullRemoteAuth(),
      thumbs: new NullDisk(),
    });
  }
}
