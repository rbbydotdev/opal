import { CommonFileSystem } from "@/Db/FileSystemTypes";
import { DexieFsDb } from "@/Db/DexieFsDb";
import { Disk } from "@/Db/Disk";
import { DiskDAO } from "@/Db/DiskDAO";
import { DiskType } from "@/Db/DiskType";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { Mutex } from "async-mutex";

export class DexieFsDbDisk extends Disk {
  static type: DiskType = "DexieFsDbDisk";
  type = DexieFsDbDisk.type;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const fs = fsTransform(new DexieFsDb(guid));
    const mt = new Mutex();
    const ft = indexCache ? FileTree.FromJSON(indexCache, fs, guid, mt) : new FileTree(fs, guid, mt);
    super(guid, fs, ft, DiskDAO.New(DexieFsDbDisk.type, guid, indexCache));
  }
}
