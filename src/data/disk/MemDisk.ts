import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/DiskType";
import { CommonFileSystem } from "@/data/FileSystemTypes";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { RequestSignalsInstance } from "@/lib/RequestSignals";
import { Mutex } from "async-mutex";
import { memfs } from "memfs";

export class MemDisk extends Disk {
  static type: DiskType = "MemDisk";
  type = MemDisk.type;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const mt = new Mutex();
    const fs = fsTransform(memfs().fs.promises);
    const ft = indexCache
      ? FileTree.FromJSON(indexCache, RequestSignalsInstance.watchPromiseMembers(fs), guid, mt)
      : new FileTree(RequestSignalsInstance.watchPromiseMembers(fs), guid, mt);

    super(guid, fs, ft, DiskDAO.New(MemDisk.type, guid, indexCache));
  }
}
