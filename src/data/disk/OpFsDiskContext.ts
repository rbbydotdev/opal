import { OPFSNamespacedFs } from "@/data/CommonFileSystem";
import { DiskContext } from "@/data/disk/DiskContext";
import { MutexFs } from "@/data/fs/MutexFs";
import { PatchedOPFS } from "@/data/fs/NamespacedFs";
import { FileTree } from "@/lib/FileTree/Filetree";
import { absPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";

export class OpFsDiskContext extends DiskContext {
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
