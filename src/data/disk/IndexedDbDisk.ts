import { FileTree } from "@/components/SidebarFileMenu/FileTree/Filetree";
import { TreeDirRootJType } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { DiskContext } from "@/data/disk/DiskContext";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/disk/DiskType";
import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { MutexFs } from "@/data/fs/MutexFs";
import { RequestSignalsInstance } from "@/lib/RequestSignals";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";

class IndexedDbDiskContext extends DiskContext {
  constructor(
    public readonly lightningFs: LightningFs,
    fs: CommonFileSystem,
    fileTree: FileTree,
    mutex: Mutex
  ) {
    super(fs, fileTree, mutex);
  }

  static create(guid: string, indexCache?: TreeDirRootJType): IndexedDbDiskContext {
    const mutex = new Mutex();
    const lightningFs = new LightningFs();
    const fs = lightningFs.promises;
    const mutexFs = new MutexFs(fs, mutex);
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs), guid, mutex)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs), guid, mutex);

    return new IndexedDbDiskContext(lightningFs, mutexFs, ft, mutex);
  }

  async tearDown(): Promise<void> {
    // Clean up any resources if needed
    // The lightningFs doesn't require explicit cleanup
  }
}

export class IndexedDbDisk extends Disk<IndexedDbDiskContext> {
  static type: DiskType = "IndexedDbDisk";
  type = IndexedDbDisk.type;

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    context?: IndexedDbDiskContext
  ) {
    const ctx = context ?? IndexedDbDiskContext.create(guid, indexCache);
    super(guid, ctx.fs, ctx.fileTree, DiskDAO.New(IndexedDbDisk.type, guid, indexCache));
    this._context = ctx;
    this.ready = ctx.lightningFs.init(guid) as unknown as Promise<void>;
  }

  async setDiskContext(newContext: IndexedDbDiskContext): Promise<void> {
    await super.setDiskContext(newContext);
    this.ready = newContext.lightningFs.init(this.guid) as unknown as Promise<void>;
  }
}
