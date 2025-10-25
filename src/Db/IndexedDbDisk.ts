import { CommonFileSystem } from "@/Db/FileSystemTypes";
import { Disk } from "@/Db/Disk";
import { DiskDAO } from "@/Db/DiskDAO";
import { DiskType } from "@/Db/DiskType";
import { MutexFs } from "@/Db/MutexFs";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { RequestSignalsInstance } from "@/lib/RequestSignals";
import LightningFs from "@isomorphic-git/lightning-fs";
import { Mutex } from "async-mutex";

export class IndexedDbDisk extends Disk {
  static type: DiskType = "IndexedDbDisk";
  type = IndexedDbDisk.type;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const mutex = new Mutex();
    const lightningFs = new LightningFs();
    const fs = fsTransform(lightningFs.promises);
    const mutexFs = new MutexFs(fs, mutex);
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs), guid, mutex)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs), guid, mutex);

    super(guid, mutexFs, ft, DiskDAO.New(IndexedDbDisk.type, guid, indexCache));
    this.ready = lightningFs.init(guid) as unknown as Promise<void>;
  }
}
