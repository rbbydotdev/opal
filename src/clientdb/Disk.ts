"use client";
import { FileTree, TreeDir, TreeFile } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import { Channel } from "@/lib/channel";
import { errorCode } from "@/lib/errors";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";
import Emittery from "emittery";
import { memfs } from "memfs";
import { nanoid } from "nanoid";
import path from "path";

export type DiskJType = { guid: string; type: DiskType; fs: Record<string, string> };

export type DiskType = "IndexedDbDisk" | "MemDisk";

export type FsType = InstanceType<typeof LightningFs> | ReturnType<typeof memfs>["fs"];

export class DiskRecord {
  guid!: string;
  type!: DiskType;
}

export class DiskDAO implements DiskRecord {
  guid!: string;
  type!: DiskType;
  static guid = () => "disk:" + nanoid();

  constructor(disk: DiskRecord) {
    Object.assign(this, disk);
  }

  static new(type: DiskType = Disk.defaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid() });
  }

  static getByGuid(guid: string) {
    return ClientDb.disks.where("guid").equals(guid).first();
  }

  save() {
    return ClientDb.disks.put(this);
  }

  toModel() {
    return Disk.from(this);
  }
}

//todo put some of the logic in a class?

export type RenameFileType = { oldPath: string; oldName: string; newPath: string; newName: string };

export abstract class Disk implements DiskRecord {
  static INDEX = "index";
  static REMOTE_INDEX = "remoteindex";

  initialIndex = false;

  broadcaster: Channel;

  // private tree: TreeDir = this.root;
  // constructor(private fs: FsType, diskGuid: string) {
  // }
  async initCacheIndex() {
    const indexCacheKey = `${this.guid}/indexCache`;
    const cacheIndex = localStorage.getItem(indexCacheKey);
    if (cacheIndex) {
      try {
        const tree = JSON.parse(cacheIndex);
        await this.fileTree.index({ tree });
      } catch (_e) {
        localStorage.removeItem(indexCacheKey);
      }
    }
    this.watch((treeDir) => {
      localStorage.setItem(indexCacheKey, JSON.stringify(treeDir));
    });
  }
  private emitter = new Emittery();
  private mutex = new Mutex();
  private currentIndexId: number = 0;

  reIndex = () => {
    return this.fileTree.index({ force: true });
  };

  async getFirstFile(): Promise<TreeFile | null> {
    await this.index();
    let first = null;
    this.fileTree.walk((file, _, exit) => {
      if (file.type === "file") {
        first = file;
        exit();
      }
    });
    return first;
  }

  onInitialIndex(callback: (fileTreeDir: TreeDir) => void) {
    if (this.initialIndex) {
      callback(this.fileTree.getRootTree());
    } else {
      this.broadcaster.once(Disk.INDEX).then(() => {
        callback(this.fileTree.getRootTree());
      });
    }
  }

  //race will call callback if there is already a fresh initialized index
  watch(callback: (fileTree: TreeDir, indexId: number) => void, { race }: { race: boolean } = { race: true }) {
    let lastHandledIndexId = -1;
    if (race) callback(this.fileTree.root, Infinity);
    return this.emitter.on(FileTree.INDEX, (indexId: number) => {
      if (indexId !== lastHandledIndexId) {
        lastHandledIndexId = indexId;
        callback(this.fileTree.root, indexId);
      }
    });
  }
  watchRemote(callback: () => void) {
    return this.broadcaster.on(FileTree.REMOTE_INDEX, callback);
  }

  static RENAME = "rename";
  static REMOTE_INDEXED = "remoteindexed";
  abstract readonly type: DiskType;

  constructor(public readonly guid: string, public fs: FsType, public fileTree: FileTree) {
    this.broadcaster = new Channel(this.guid);
    this.broadcaster.on(Disk.RENAME, async (data: RenameFileType) => {
      const { oldPath, newPath } = data;
      console.log("remote rename", { oldPath, newPath });
    });
    this.broadcaster.on(Disk.REMOTE_INDEXED, async () => {
      console.log("remote index");
      this.fileTree.reIndex();
    });
    this.initCacheIndex();
    this.index();
  }

  static defaultDiskType: DiskType = "IndexedDbDisk";

  static guid = () => "disk:" + nanoid();

  static new(guid: string = Disk.guid(), type: DiskType = Disk.defaultDiskType) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }

  static from({ guid, type }: { guid: string; type: DiskType }) {
    return type === "IndexedDbDisk" ? new IndexedDbDisk(guid) : new MemDisk(guid);
  }

  async mkdirRecursive(filePath: string) {
    const segments = path.dirname(filePath).split("/").slice(1);
    for (let i = 1; i <= segments.length; i++) {
      try {
        await this.fs.promises.mkdir("/" + segments.slice(0, i).join("/"), { recursive: true, mode: 0o777 });
      } catch (err) {
        if (errorCode(err).code !== "EEXIST") {
          console.error(`Error creating directory ${path.dirname(filePath)}:`, err);
        }
      }
    }
  }
  index() {
    return {};
    return this.fileTree.index();
    // this.initialIndex = true;
    // return this.broadcaster.emit(Disk.INDEX, ++this.currentIndexId);
  }

  onRename(fn: (props: RenameFileType) => void) {
    return this.broadcaster.on(Disk.RENAME, fn);
  }

  async renameFile(oldPath: string, newBaseName: string): Promise<RenameFileType> {
    const cleanName = newBaseName.replace(/\//g, ":");

    const NOCHANGE: RenameFileType = {
      newPath: oldPath,
      newName: path.basename(oldPath),
      oldPath,
      oldName: path.basename(oldPath),
    };

    if (!cleanName) return NOCHANGE;
    if (cleanName === path.basename(oldPath)) return NOCHANGE;

    const fullPath = path.join(path.dirname(oldPath), cleanName);

    //check if file exists
    if (await this.fs.promises.stat(fullPath).catch(() => false)) {
      return NOCHANGE;
    }
    await this.fs.promises.rename(oldPath, fullPath);
    await this.fileTree.reIndex();

    const CHANGE: RenameFileType = {
      newPath: fullPath,
      newName: path.basename(fullPath),
      oldName: path.basename(oldPath),
      oldPath,
    };

    await this.broadcaster.emit(Disk.REMOTE_INDEXED);
    await this.broadcaster.emit(Disk.RENAME, CHANGE);
    return CHANGE;
  }

  async writeFileRecursive(filePath: string, content: string) {
    await this.mkdirRecursive(filePath);
    try {
      await this.fs.promises.writeFile(filePath, content, { encoding: "utf8", mode: 0o777 });
    } catch (err) {
      if (errorCode(err).code !== "EEXIST") {
        console.error(`Error writing file ${filePath}:`, err);
      }
    }
  }

  async withFs(fn: (fs: FsType) => Promise<unknown> | unknown) {
    await fn(this.fs);
    await this.fileTree.reIndex();
    return this.fs;
  }

  toJSON() {
    return { guid: this.guid, type: this.type } as DiskRecord;
  }

  teardown() {
    this.broadcaster.tearDown();
  }

  get promises() {
    return this.fs.promises;
  }
  get isIndexed() {
    return this.fileTree.initialIndex;
  }
}

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  readonly type = IndexedDbDisk.type;
  // broadcaster: ChannelEmittery;

  constructor(public readonly guid: string, public readonly db = ClientDb) {
    const fs = new LightningFs();
    fs.init(guid);
    super(guid, fs, new FileTree(fs));
  }
}

export class MemDisk extends Disk {
  readonly type = "MemDisk";

  constructor(public readonly guid: string, public readonly db = ClientDb) {
    const fs = memfs().fs;
    super(guid, fs, new FileTree(fs));
  }
}
