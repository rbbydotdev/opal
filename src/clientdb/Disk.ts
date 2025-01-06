"use client";
import { FileTree } from "@/clientdb/filetree";
import { ClientDb } from "@/clientdb/instance";
import { ChannelEmittery } from "@/lib/channel";
// import { ChannelEmittery } from "@/lib/channel";
import { errorCode } from "@/lib/errors";
import LightningFs from "@isomorphic-git/lightning-fs";
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

// private channel: BroadcastChannel;

// constructor(public readonly channelName: string, options?: Options<EventData>) {
//   super(options);
//   this.channel = new BroadcastChannel(channelName);
export abstract class Disk implements DiskRecord {
  static REMOTE_RENAME = "remoterename";
  abstract fs: FsType;
  abstract fileTree: FileTree;
  abstract readonly type: DiskType;
  broadcaster: ChannelEmittery;

  constructor(public readonly guid: string) {
    this.broadcaster = new ChannelEmittery(guid);
    this.broadcaster.on(Disk.REMOTE_RENAME, async (data) => {
      const { oldPath, newBaseName } = data;
      console.log({ oldPath, newBaseName });
    });
  }

  // protected setupRemoteListener_() {
  //   this.broadcaster.on(Disk.REMOTE_INDEX, () => {
  //     this.fileTree.reIndex();
  //   });
  // }

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

  async renameFile(oldPath: string, newBaseName: string): Promise<{ newPath: string; newName: string }> {
    const cleanName = newBaseName.replace(/\//g, ":");

    const nochange = { newPath: oldPath, newName: path.basename(oldPath) };

    if (!cleanName) return nochange;
    if (cleanName === path.basename(oldPath)) return nochange;

    const fullPath = path.join(path.dirname(oldPath), cleanName);

    //check if file exists
    if (await this.fs.promises.stat(fullPath).catch(() => false)) {
      return nochange;
    }
    await this.fs.promises.rename(oldPath, fullPath);
    await this.fileTree.reIndex();
    const change = { newPath: fullPath, newName: path.basename(fullPath) };
    this.broadcaster.emit(Disk.REMOTE_RENAME, { oldPath, newBaseName });
    return change;
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
    this.fileTree.teardown();
    // this.broadcaster.tearDown();
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
  readonly fs: InstanceType<typeof LightningFs>;
  readonly fileTree: FileTree;
  // broadcaster: ChannelEmittery;

  setupIndexListener() {}
  constructor(public readonly guid: string, public readonly db = ClientDb) {
    super(guid);
    this.fs = new LightningFs();
    this.fs.init(this.guid);
    this.fileTree = new FileTree(this.fs, this.guid);
    // this.broadcaster = new ChannelEmittery(guid);
    // this.broadcaster.on(Disk.REMOTE_INDEX, () => {
    //   this.fileTree.reIndex();
    // });
  }
}

export class MemDisk extends Disk {
  readonly type = "MemDisk";
  public readonly fs: ReturnType<typeof memfs>["fs"];
  readonly fileTree: FileTree;
  // broadcaster: ChannelEmittery;

  constructor(public readonly guid: string, public readonly db = ClientDb) {
    super(guid);
    this.fs = memfs().fs;
    this.fileTree = new FileTree(this.fs, this.guid);
    // this.broadcaster = new ChannelEmittery(guid);
    // this.broadcaster.on(Disk.REMOTE_INDEX, () => {
    //   this.fileTree.remoteIndexed();
    // });
    // this.fileTree.watch(() => {
    //   this.broadcaster.emit(Disk.REMOTE_INDEX);
    // });
  }
}
