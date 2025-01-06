"use client";
import { Disk, DiskDAO, IndexedDbDisk } from "@/clientdb/Disk";
import { ClientDb } from "@/clientdb/instance";
// import { randomSlug } from "@/lib/randomSlug";
import { TreeDir } from "@/clientdb/filetree";
import { BadRequestError, NotFoundError } from "@/lib/errors";
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

    const [auth, disk] = await Promise.all([wsd.loadRemoteAuth(), wsd.loadDisk()]);

    return new Workspace({ ...wsd, remoteAuth: auth, disk });
  }
  async toWorkspace() {
    const [auth, disk] = await Promise.all([this.loadRemoteAuth(), this.loadDisk()]);
    return new Workspace({ ...this, remoteAuth: auth, disk });
  }

  private async loadRemoteAuth() {
    const remoteAuth = await ClientDb.remoteAuths.where("guid").equals(this.remoteAuthGuid).first();
    if (!remoteAuth) throw new NotFoundError("RemoteAuth not found");
    return new RemoteAuthDAO(remoteAuth);
  }
  private async loadDisk() {
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
export class Workspace implements WorkspaceRecord {
  memid = nanoid();
  static seedFiles: Record<string, string> = {
    "/welcome.md": "# Welcome to your new workspace!",
    "/home/post1.md": "# Hello World!",
    "/drafts/draft1.md": "# Goodbye World!",
    "/ideas/ideas.md": "# Red Green Blue",
  };

  createdAt: Date = new Date();
  name: string;
  guid: string;
  remoteAuth: RemoteAuth;
  private disk: Disk;

  get id() {
    return this.guid;
  }

  static async fromRoute(route: string) {
    if (!route.startsWith(Workspace.rootRoute)) throw new BadRequestError("Invalid route");

    const name = route.slice(Workspace.rootRoute.length + 1).split("/")[0];

    const ws =
      (await ClientDb.workspaces.where("name").equals(name).first()) ??
      (await ClientDb.workspaces.where("guid").equals(name).first());
    if (!ws) throw new NotFoundError("Workspace not found");
    const wsd = new WorkspaceDAO(ws);
    return wsd.toWorkspace();
  }

  static async createWithSeedFiles(name: string) {
    const ws = await WorkspaceDAO.create(name);
    ws.disk.withFs(async () => {
      await Promise.all(
        Object.entries(Workspace.seedFiles).map(([filePath, content]) => ws.disk.writeFileRecursive(filePath, content))
      );
    });
    return ws;
  }

  renameFile = async (filePath: string, newBaseName: string) => {
    return this.disk.renameFile(filePath, newBaseName);
  };

  watchFileTree(callback: (fileTree: TreeDir) => void, race?: { race: boolean }) {
    //TODO this should be a method on disk?
    return this.disk.fileTree.watch(callback, race);
  }
  onInitialIndex(callback: (fileTree: TreeDir) => void) {
    return this.disk.fileTree.onInitialIndex(callback);
  }
  private getFileTreeDir() {
    return this.disk.fileTree.getRootTree();
  }
  getFirstFile() {
    return this.disk.fileTree.getFirstFile();
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
    this.name = name;
    this.guid = guid;
    this.remoteAuth = remoteAuth instanceof RemoteAuthDAO ? remoteAuth.toModel() : remoteAuth;
    this.disk = disk instanceof DiskDAO ? disk.toModel() : disk;
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
    return this.resolveFileUrl("");
  };
  resolveFileUrl = (filePath: string) => {
    return this.href + filePath;
  };

  get isIndexed() {
    return this.disk.isIndexed;
  }
  get remoteAuthGuid() {
    return this.remoteAuth.guid;
  }
  get diskGuid() {
    return this.disk.guid;
  }

  get href() {
    return `${Workspace.rootRoute}/${this.name}`;
  }
}
