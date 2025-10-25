import { CommonFileSystem } from "@/Db/FileSystemTypes";
import { Disk } from "@/Db/Disk";
import { DiskDAO } from "@/Db/DiskDAO";
import { DiskType } from "@/Db/DiskType";
import { KVFileSystem, LocalStorageStore } from "@/Db/KVFs";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { Mutex } from "async-mutex";

export class LocalStorageFsDisk extends Disk {
  static type: DiskType = "LocalStorageFsDisk";
  type = LocalStorageFsDisk.type;

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const fs = fsTransform(new KVFileSystem(new LocalStorageStore(guid)));
    const mt = new Mutex();
    const ft = indexCache ? FileTree.FromJSON(indexCache, fs, guid, mt) : new FileTree(fs, guid, mt);
    super(guid, fs, ft, DiskDAO.New(LocalStorageFsDisk.type, guid, indexCache));
  }
}
