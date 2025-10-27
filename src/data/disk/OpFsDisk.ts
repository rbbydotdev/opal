import { OPFSNamespacedFs } from "@/data/CommonFileSystem";
import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/DiskType";
import { MutexFs } from "@/data/fs/MutexFs";
import { PatchedOPFS } from "@/data/fs/NamespacedFs";
import { ClientDb } from "@/data/instance";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { absPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";

export class OpFsDisk extends Disk {
  static type: DiskType = "OpFsDisk";
  type = OpFsDisk.type;
  ready: Promise<void>;
  private internalFs: OPFSNamespacedFs;
  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    fsTransform: (fs: OPFSNamespacedFs) => OPFSNamespacedFs = (fs) => fs
  ) {
    const mutex = new Mutex();
    const { promise, resolve } = Promise.withResolvers<void>();
    const patchedOPFS = new PatchedOPFS(
      navigator.storage.getDirectory().then(async (dir) => {
        resolve();
        return dir;
      }) as Promise<IFileSystemDirectoryHandle>
    );

    const origFs = new OPFSNamespacedFs(patchedOPFS.promises, absPath("/" + guid));
    const fs = fsTransform(origFs);
    void mutex.runExclusive(() => origFs.init());
    super(guid, new MutexFs(fs, mutex), new FileTree(fs, guid, mutex), DiskDAO.New(OpFsDisk.type, guid, indexCache));

    this.internalFs = fs; // as OPFSNamespacedFs;
    this.ready = promise;
  }

  async destroy() {
    await Promise.all([this.internalFs.tearDown(), ClientDb.disks.delete(this.guid)]);
  }
}
