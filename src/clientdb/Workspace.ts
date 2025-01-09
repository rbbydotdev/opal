"use client";
import { Disk, DiskDAO, IndexedDbDisk } from "@/clientdb/Disk";
import { TreeDir } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { absPath, AbsPath, RelPath } from "@/lib/paths";
import { nanoid } from "nanoid";
import { RemoteAuth, RemoteAuthDAO } from "./RemoteAuth";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  diskGuid!: string;
  createdAt!: Date;
  remoteAuthGuid!: string;
}

export class WorkspaceDAO implements WorkspaceRecord {
  // static rootRoute = "/workspace";
  static guid = () => "workspace:" + nanoid();

  guid!: string;
  name!: string;
  diskGuid!: string;
  createdAt!: Date;
  remoteAuthGuid!: string;
  RemoteAuth?: RemoteAuthDAO;
  Disk?: DiskDAO;

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
  save = async () => {
    return ClientDb.workspaces.put({
      guid: this.guid,
      name: this.name,
      diskGuid: this.diskGuid,
      remoteAuthGuid: this.remoteAuthGuid,
      createdAt: this.createdAt,
    });
  };
  static async create(
    name: string,
    remoteAuth: RemoteAuthDAO = RemoteAuthDAO.new(),
    disk: DiskDAO = DiskDAO.new(IndexedDbDisk.type)
  ) {
    const workspace = new WorkspaceDAO({
      name,
      guid: WorkspaceDAO.guid(),
      diskGuid: disk.guid,
      remoteAuthGuid: remoteAuth.guid,
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
  async toModel() {
    const [auth, disk] = await Promise.all([
      this.RemoteAuth ? Promise.resolve(this.RemoteAuth) : this.getRemoteAuth(),
      this.Disk ? Promise.resolve(this.Disk) : this.getDisk(),
    ]);
    return new Workspace({ ...this, remoteAuth: auth, disk });
  }

  private async getRemoteAuth() {
    const remoteAuth = await ClientDb.remoteAuths.where("guid").equals(this.remoteAuthGuid).first();
    if (!remoteAuth) throw new NotFoundError("RemoteAuth not found");
    return new RemoteAuthDAO(remoteAuth);
  }
  private async getDisk() {
    const disk = await ClientDb.disks.where("guid").equals(this.diskGuid).first();

    if (!disk) throw new NotFoundError("Disk not found");
    return new DiskDAO(disk);
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

  get id() {
    return this.guid;
  }

  static parseWorkspacePath(pathname: string) {
    const workspaceRouteRegex = new RegExp(`^${Workspace.rootRoute.replace(/\//g, "\\/")}\\/([^/]+)(\\/.*)?$`);
    const match = pathname.match(workspaceRouteRegex);
    if (!match) {
      return { workspaceId: null, filePath: null };
    }
    const [_, workspaceId, filePath] = match;
    return { workspaceId, filePath: filePath ? absPath(filePath) : undefined };
  }
  //shoulndt this be in the dao?
  static async fetchFromRoute(route: string) {
    if (!route.startsWith(Workspace.rootRoute)) throw new BadRequestError("Invalid route");

    const name = route.slice(Workspace.rootRoute.length + 1).split("/")[0];

    const ws =
      (await ClientDb.workspaces.where("name").equals(name).first()) ??
      (await ClientDb.workspaces.where("guid").equals(name).first());
    if (!ws) throw new NotFoundError("Workspace not found");
    return (await new WorkspaceDAO(ws).withRelations()).toModel();
  }

  static async createWithSeedFiles(name: string) {
    const ws = await WorkspaceDAO.create(name);
    ws.disk.withFs(async () => {
      await Promise.all(
        Object.entries(Workspace.seedFiles).map(([filePath, content]) =>
          ws.disk.writeFileRecursive(absPath(filePath), content)
        )
      );
    });
    return ws;
  }

  //  "/drafts/draft1.md/draft1.mddsad/draft1.mddsad"
  replaceUrlPath(pathname: string, oldPath: AbsPath, newPath: AbsPath) {
    const { filePath } = Workspace.parseWorkspacePath(pathname);
    if (!filePath) return pathname;
    return this.resolveFileUrl(absPath(filePath.replace(oldPath.str, newPath.str)));
  }

  addDir(dirPath: AbsPath, newDirName: RelPath) {
    return this.disk.addDir(dirPath.join(newDirName));
  }
  addFile(dirPath: AbsPath, newFileName: RelPath, content = "") {
    return this.disk.addFile(dirPath.join(newFileName), content);
  }

  renameFile = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    return this.disk.renameFile(oldFullPath, newFullPath);
  };
  renameDir = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    return this.disk.renameDir(oldFullPath, newFullPath);
  };

  onInitialIndex(callback: (fileTree: TreeDir) => void) {
    return this.disk.initialIndexListener(callback);
  }
  watchDisk(callback: (fileTree: TreeDir) => void) {
    return this.disk.latestIndexListener(callback);
  }
  getFirstFile() {
    return this.disk.getFirstFile();
  }
  getFlatDirTree() {
    return this.disk.fileTree.dirs;
  }

  static rootRoute = "/workspace";

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
    super({ name, guid, diskGuid: disk.guid, remoteAuthGuid: remoteAuth.guid, createdAt: new Date() });
    this.name = name;
    this.guid = guid;
    this.remoteAuth = remoteAuth instanceof RemoteAuthDAO ? remoteAuth.toModel() : remoteAuth;
    this.disk = disk instanceof DiskDAO ? disk.toModel() : disk;
  }

  init() {
    this.disk.init();
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
      remoteAuthGuid: this.remoteAuth.guid,
      diskGuid: this.disk.guid,
    } satisfies WorkspaceRecord & { href: string };
  }

  home = () => {
    return this.href;
  };
  resolveFileUrl = (filePath: AbsPath) => {
    return this.href + decodeURIComponent(filePath.str);
  };

  get isIndexed() {
    return this.disk.isIndexed;
  }
  get href() {
    return `${Workspace.rootRoute}/${this.name}`;
  }
}
