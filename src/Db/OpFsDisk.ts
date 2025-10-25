import { OPFSNamespacedFs } from "@/Db/CommonFileSystem";
import { Disk } from "@/Db/Disk";
import { DiskDAO } from "@/Db/DiskDAO";
import { DiskType } from "@/Db/DiskType";
import { ClientDb } from "@/Db/instance";
import { MutexFs } from "@/Db/MutexFs";
import { PatchedOPFS } from "@/Db/NamespacedFs";
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
