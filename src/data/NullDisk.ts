import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/DiskType";
import { CommonFileSystem, NullFileSystem } from "@/data/FileSystemTypes";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { Mutex } from "async-mutex";

export class NullDisk extends Disk {
  static type: DiskType = "NullDisk";
  type = NullDisk.type;
  ready = new Promise<void>(() => {}); //never resolves since subsequent ops will fail

  constructor(
    public readonly guid = "__disk__NullDisk",
    _indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const fs = fsTransform(NullFileSystem);
    const mt = new Mutex();
    const ft = new FileTree(fs, guid, mt);
    super("__disk__NullDisk", fs, ft, DiskDAO.New(NullDisk.type, guid));
  }
  async init() {
    return () => {};
  }
}
