import { Disk, DiskDAO, IndexedDbDisk } from "@/clientdb/Disk";
import { ClientDb } from "@/clientdb/instance";
// import { randomSlug } from "@/lib/randomSlug";
import { errorCode } from "@/lib/errors";
import { nanoid } from "nanoid";
import path from "path";
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

  static async fromRoute(route: string) {
    if (!route.startsWith(Workspace.rootRoute)) throw new Error("Invalid route");
    const name = route.slice(Workspace.rootRoute.length + 1);
    await ClientDb.getWorkspaceByName(name);
  }

  static async allDAO() {
    const workspaceRecords = await ClientDb.allWorkspaces();
    return workspaceRecords.map((ws) => new WorkspaceDAO(ws));
  }
  static async all() {
    const workspaceRecords = await ClientDb.allWorkspaces();
    for (const ws of workspaceRecords) {
      const wsd = new WorkspaceDAO(ws);
      const [auth, disk] = await Promise.all([wsd.loadRemoteAuth(), wsd.loadDisk()]);
      return new Workspace({ ...wsd, remoteAuth: auth, disk });
    }
    return workspaceRecords;
  }
  save = async () => {
    return ClientDb.workspaces.put(this);
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
    const ws = await ClientDb.getWorkspaceByGuid(guid);
    if (!ws) throw new Error("Workspace not found");
    const wsd = new WorkspaceDAO(ws);
    const [auth, disk] = await Promise.all([wsd.loadRemoteAuth(), wsd.loadDisk()]);
    return new Workspace({ ...wsd, remoteAuth: auth, disk });
  }
  private async loadRemoteAuth() {
    const remoteAuth = await ClientDb.getRemoteAuthByGuid(this.remoteAuthGuid);
    if (!remoteAuth) throw new Error("RemoteAuth not found");
    return new RemoteAuthDAO(remoteAuth);
  }
  private async loadDisk() {
    const disk = await ClientDb.getDiskByGuid(this.diskGuid);
    if (!disk) throw new Error("Disk not found");
    return new DiskDAO(disk);
  }

  constructor(properties: WorkspaceRecord) {
    Object.assign(this, properties);
  }
}

//TODO: change the mututation of this class to instead have a database tied object, but when othere deps are loaded it beomces a different object
//for exampple the diskguid
export class Workspace implements WorkspaceRecord {
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
  disk: Disk;

  static async createWithSeedFiles(name: string) {
    const ws = await WorkspaceDAO.create(name);
    await ws.disk.withFs(async (fs) => {
      const promises: Promise<void>[] = [];
      for (const [filePath, content] of Object.entries(Workspace.seedFiles)) {
        const writeFile = async (filePath: string, content: string) => {
          try {
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true, mode: 0o777 });
          } catch (err) {
            if (errorCode(err).code !== "EEXIST") {
              console.error(`Error creating directory ${path.dirname(filePath)}:`, err);
            }
          }
          try {
            await fs.promises.writeFile(filePath, content, { encoding: "utf8", mode: 0o777 });
          } catch (err) {
            console.error(`Error writing file ${filePath}:`, err);
          }
        };
        promises.push(writeFile(filePath, content));
      }
      return Promise.all(promises);
    });
    return ws;
  }

  get fileTree() {
    return this.disk.getFileTree();
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

  resolveFileUrl(filePath: string) {
    return this.href + filePath;
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
