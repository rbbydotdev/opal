import { FileTree } from "@/components/SidebarFileMenu/FileTree/Filetree";
import { TreeDirRootJType } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { DiskContext } from "@/data/disk/DiskContext";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/disk/DiskType";
import { OPFSNamespacedFs } from "@/data/fs/CommonFileSystem";
import { MutexFs } from "@/data/fs/MutexFs";
import { PatchedOPFS } from "@/data/fs/NamespacedFs";
import { ClientDb } from "@/data/instance";
import { absPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";

class OpFsDiskContext extends DiskContext {
  constructor(
    public readonly internalFs: OPFSNamespacedFs,
    fs: MutexFs,
    fileTree: FileTree,
    mutex: Mutex,
    public readonly ready: Promise<void>
  ) {
    super(fs, fileTree, mutex);
  }

  static create(guid: string): OpFsDiskContext {
    const mutex = new Mutex();
    const { promise, resolve } = Promise.withResolvers<void>();

    const patchedOPFS = new PatchedOPFS(
      navigator.storage.getDirectory().then(async (dir) => {
        resolve();
        return dir;
      }) as Promise<IFileSystemDirectoryHandle>
    );

    const origFs = new OPFSNamespacedFs(patchedOPFS.promises, absPath("/" + guid));
    const mutexFs = new MutexFs(origFs, mutex);
    const fileTree = new FileTree(origFs, guid, mutex);

    void mutex.runExclusive(() => origFs.init());

    return new OpFsDiskContext(origFs, mutexFs, fileTree, mutex, promise);
  }

  async tearDown(): Promise<void> {
    await this.internalFs.tearDown();
  }
}

export class OpFsDisk extends Disk<OpFsDiskContext> {
  static type: DiskType = "OpFsDisk";
  type = OpFsDisk.type;
  ready: Promise<void>;

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    context?: OpFsDiskContext
  ) {
    const ctx = context ?? OpFsDiskContext.create(guid);
    super(guid, ctx.fs, ctx.fileTree, DiskDAO.New(OpFsDisk.type, guid, indexCache));
    this._context = ctx;
    this.ready = ctx.ready;
  }

  get internalFs(): OPFSNamespacedFs {
    return this._context!.internalFs;
  }

  async setDiskContext(newContext: OpFsDiskContext): Promise<void> {
    await super.setDiskContext(newContext);
    this.ready = newContext.ready;
  }

  async destroy() {
    await Promise.all([this.internalFs.tearDown(), ClientDb.disks.delete(this.guid)]);
  }
}
