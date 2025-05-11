"use client";
import { Disk, DiskDAO, DiskJType, IndexedDbDisk, NullDisk } from "@/Db/Disk";
import { ClientDb } from "@/Db/instance";
import { BadRequestError, errF, NotFoundError } from "@/lib/errors";
import { absPath, AbsPath, isAncestor, relPath, RelPath } from "@/lib/paths";
import { nanoid } from "nanoid";
import slugify from "slugify";
import { TreeDir, TreeNode } from "../lib/FileTree/TreeNode";
import { NullRemoteAuth, RemoteAuth, RemoteAuthDAO, RemoteAuthJType } from "./RemoteAuth";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  createdAt!: Date;
  remoteAuth!: RemoteAuthJType;
}

export class WorkspaceDAO implements WorkspaceRecord {
  // static rootRoute = "/workspace";
  static guid = () => "workspace:" + nanoid();

  guid!: string;
  name!: string;
  disk!: DiskJType;
  createdAt!: Date;
  remoteAuth!: RemoteAuthJType;

  RemoteAuth?: RemoteAuthDAO;
  Disk?: DiskDAO;

  static fromJSON(json: WorkspaceRecord) {
    return new WorkspaceDAO(json);
  }

  static async allDAO() {
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
      createdAt: this.createdAt,
    });
  };
  static async create(
    name: string,
    remoteAuth: RemoteAuthDAO = RemoteAuthDAO.new(),
    disk: DiskDAO = DiskDAO.new(IndexedDbDisk.type)
  ) {
    let uniqueName = WorkspaceDAO.Slugify(name);
    let inc = 0;
    while (await WorkspaceDAO.nameExists(uniqueName)) {
      uniqueName = `${name}-${++inc}`;
      console.log(uniqueName);
    }
    const workspace = new WorkspaceDAO({
      name: uniqueName,
      guid: WorkspaceDAO.guid(),
      disk: disk.toJSON(),
      remoteAuth: remoteAuth.toJSON(),
      createdAt: new Date(),
    });
    await ClientDb.transaction("rw", ClientDb.disks, ClientDb.remoteAuths, ClientDb.workspaces, async () => {
      //TODO will this work?
      //mem leak?
      return await Promise.all([disk.save(), remoteAuth.save(), workspace.save()]);
    });

    return new Workspace({ ...workspace, remoteAuth, disk });
  }
  static async byGuid(guid: string) {
    const ws = await ClientDb.workspaces.where("guid").equals(guid).first();
    if (!ws) throw new NotFoundError("Workspace not found");

    const wsd = new WorkspaceDAO(ws);

    const [auth, disk] = await Promise.all([wsd.getRemoteAuth(), wsd.getDisk()]);

    return new Workspace({ ...wsd, remoteAuth: auth, disk });
  }
  async withRelations() {
    const [auth, disk] = await Promise.all([this.getRemoteAuth(), this.getDisk()]);
    this.RemoteAuth = auth;
    this.Disk = disk;
    return this;
  }
  static Slugify(name: string) {
    return slugify(name);
  }
  async toModel() {
    const [auth, disk] = await Promise.all([
      this.RemoteAuth ? Promise.resolve(this.RemoteAuth) : this.getRemoteAuth(),
      this.Disk ? Promise.resolve(this.Disk) : this.getDisk(),
    ]);
    return new Workspace({ ...this, remoteAuth: auth, disk });
  }

  private async getRemoteAuth() {
    const remoteAuth = await ClientDb.remoteAuths.where("guid").equals(this.remoteAuth.guid).first();
    if (!remoteAuth) throw new NotFoundError("RemoteAuth not found");
    return new RemoteAuthDAO(remoteAuth);
  }
  private async getDisk() {
    const disk = await ClientDb.disks.where("guid").equals(this.disk.guid).first();

    if (!disk) throw new NotFoundError("Disk not found");
    return new DiskDAO(disk);
  }

  static async fetchFromRoute(route: string) {
    if (!isAncestor(route, Workspace.rootRoute)) throw new BadRequestError("Invalid route").hint(route);

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
//TODO: change the mututation of this class to instead have a database tied object, but when othere deps are loaded it beomces a different object
//for exampple the diskguid
export class Workspace extends WorkspaceDAO {
  // export class Workspace implements WorkspaceRecord {
  memid = nanoid();
  static seedFiles: Record<string, string> = {
    "/welcome.md": "# Welcome to your new workspace!",
    "/home/drafts/post1.md": "# Hello World!",
    "/drafts/draft1.md": "# Goodbye World!",
    "/ideas/ideas.md": "# Red Green Blue",
  };

  createdAt: Date = new Date();
  name: string;
  guid: string;
  remoteAuth: RemoteAuth;
  disk: Disk;

  constructor({
    name,
    guid,
    disk,
    remoteAuth,
  }: {
    name: string;
    guid: string;
    disk: DiskDAO;
    remoteAuth: RemoteAuthDAO;
  }) {
    super({
      name,
      guid,
      disk: disk.toJSON(),
      remoteAuth: remoteAuth.toJSON(),
      createdAt: new Date(),
    });
    this.name = Workspace.Slugify(name);
    this.guid = guid;
    this.remoteAuth = remoteAuth instanceof RemoteAuthDAO ? remoteAuth.toModel() : remoteAuth;
    this.disk = disk instanceof DiskDAO ? disk.toModel() : disk;
  }

  get id() {
    return this.guid;
  }

  static parseWorkspacePath(pathname: string) {
    if (!pathname.startsWith(Workspace.rootRoute)) return { workspaceId: null, filePath: null };
    const [workspaceId, ...filePathRest] = relPath(pathname.replace(this.rootRoute, "")).decode().split("/");
    const filePath = filePathRest.join("/");
    if (!workspaceId) {
      return { workspaceId: null, filePath: null };
    }
    // const workspaceRouteRegex = new RegExp(`^${Workspace.rootRoute.replace(/\//g, "\\/")}\\/([^/]+)(\\/.*)?$`);
    // const match = pathname.match(workspaceRouteRegex);
    // if (!match) {
    //   return { workspaceId: null, filePath: null };
    // }
    // const [_, workspaceId, filePath] = match;
    return { workspaceId, filePath: filePath ? absPath(filePath) : undefined };
  }
  static async createWithSeedFiles(name: string) {
    const ws = await WorkspaceDAO.create(name);
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
  newFile(dirPath: AbsPath, newFileName: RelPath, content = "") {
    return this.disk.newFile(dirPath.join(newFileName), content);
  }
  addVirtualFile({ type, name }: { type: TreeNode["type"]; name: TreeNode["name"] }, selectedNode: TreeNode | null) {
    return this.disk.addVirtualFile({ type, name }, selectedNode);
  }
  removeVirtualfile(path: AbsPath) {
    return this.disk.removeVirtualFile(path);
  }
  removeFile = async (filePath: AbsPath) => {
    // await serviceworker.evictCache(filePath);
    return this.disk.removeFile(filePath);
  };

  renameFile = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { newPath } = await this.disk.renameDirFile(oldNode.path, newFullPath);
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

  onInitialIndex(callback: (fileTree: TreeDir) => void) {
    return this.disk.initialIndexListener(callback);
  }
  watchDisk(callback: (fileTree: TreeDir) => void) {
    return this.disk.latestIndexListener(callback);
  }
  async getFirstFile() {
    //TODO dont you need to make sure its indexed first?
    await this.disk.awaitFirstIndex();
    return this.disk.getFirstFile();
  }
  async awaitFirstIndex() {
    return this.disk.awaitFirstIndex();
  }
  async dropExternalFile(file: File, targetPath: AbsPath) {
    return this.disk.newFile(targetPath.join(file.name), new Uint8Array(await file.arrayBuffer()));
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
  };

  toJSON() {
    return {
      name: this.name,
      guid: this.guid,
      href: this.href,
      createdAt: this.createdAt,
      remoteAuth: this.remoteAuth.toJSON(),
      disk: this.disk.toJSON(),
    } satisfies WorkspaceRecord & { href: string };
  }

  delete = async () => {
    await ClientDb.transaction("rw", ClientDb.workspaces, ClientDb.disks, async () => {
      await Promise.all([ClientDb.workspaces.delete(this.guid), this.disk.teardown(), this.disk.delete()]);
    });
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
      if (node.mimeType?.startsWith("image/")) {
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
    });
  }
}
