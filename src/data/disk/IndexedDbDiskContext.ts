import { DiskContext } from "@/data/disk/DiskContext";
import { CommonFileSystem } from "@/data/FileSystemTypes";
import { MutexFs } from "@/data/fs/MutexFs";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { RequestSignalsInstance } from "@/lib/RequestSignals";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";

export class IndexedDbDiskContext extends DiskContext {
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
