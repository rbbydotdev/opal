import { FileTree } from "@/components/filetree/Filetree";
import { TreeDirRootJType } from "@/components/filetree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/disk/DiskType";
import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { RequestSignalsInstance } from "@/lib/service-worker/RequestSignalInstance";
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
