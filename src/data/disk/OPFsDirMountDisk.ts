import { Disk } from "@/data/disk/Disk";
import { DiskContext } from "@/data/disk/DiskContext";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/disk/DiskType";
import { NullDiskContext } from "@/data/disk/NullDisk";
import { DirectoryHandleStore } from "@/data/fs/DirectoryHandleStore";
import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { MutexFs } from "@/data/fs/MutexFs";
import { PatchedDirMountOPFS } from "@/data/PatchedDirMountOPFS";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { Mutex } from "async-mutex";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";

class OpFsDirMountDiskContext extends DiskContext {
  constructor(fs: CommonFileSystem, fileTree: FileTree, mutex: Mutex) {
    super(fs, fileTree, mutex);
  }

  static createFromHandle(guid: string, handle: FileSystemDirectoryHandle): OpFsDirMountDiskContext {
    const mutex = new Mutex();
    const patchedDirMountOPFS = new PatchedDirMountOPFS(
      Promise.resolve(handle) as unknown as Promise<IFileSystemDirectoryHandle>
    );
    const mutexFs = new MutexFs(patchedDirMountOPFS, mutex);
    const fileTree = new FileTree(patchedDirMountOPFS, guid, mutex);

    return new OpFsDirMountDiskContext(mutexFs, fileTree, mutex);
  }

  async tearDown(): Promise<void> {
    // Clean up any resources if needed
  }
}

export class OpFsDirMountDisk extends Disk<OpFsDirMountDiskContext> {
  static type: DiskType = "OpFsDirMountDisk";
  type = OpFsDirMountDisk.type;
  ready: Promise<void>;
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  get dirName() {
    return this.directoryHandle?.name ?? null;
  }

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    context?: OpFsDirMountDiskContext
  ) {
    const ctx = context ?? NullDiskContext.create("__null__/" + guid);
    super(guid, ctx.fs, ctx.fileTree, DiskDAO.New(OpFsDirMountDisk.type, guid, indexCache));
    this._context = ctx;

    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.ready = promise;

    // Try to restore directory handle from storage
    this.initializeFromStorage()
      .then(() => {
        ctx.mutex.release();
        resolve();
      })
      .catch(reject);
  }

  private async initializeFromStorage(): Promise<void> {
    const handle = await DirectoryHandleStore.getHandle(this.guid);
    if (handle) {
      await this.setDirectoryHandle(handle, true); // Skip storage when restoring
    }
  }

  async setDirectoryHandle(handle: FileSystemDirectoryHandle, skipStorage = false): Promise<void> {
    const previousHandle = this.directoryHandle;
    this.directoryHandle = handle;
    const shouldStore = !skipStorage && (!previousHandle || previousHandle.name !== handle.name);
    if (shouldStore) await DirectoryHandleStore.storeHandle(this.guid, handle);

    const newContext = OpFsDirMountDiskContext.createFromHandle(this.guid, handle);
    await this.setDiskContext(newContext);
  }

  async selectDirectory(): Promise<FileSystemDirectoryHandle> {
    if (typeof window.showDirectoryPicker === "undefined") {
      throw new Error("Directory picker not supported in this browser");
    }
    const handle = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    await this.setDirectoryHandle(handle);
    return handle;
  }

  hasDirectoryHandle(): boolean {
    return this.directoryHandle !== null;
  }

  getDirectoryName(): string | null {
    return this.directoryHandle?.name || null;
  }

  async needsDirectorySelection(): Promise<boolean> {
    if (this.directoryHandle) {
      return false;
    }

    // Check if we have metadata (meaning user previously selected a directory but it was lost)
    const metadata = await DirectoryHandleStore.getStoredMetadata(this.guid);
    return metadata !== undefined;
  }

  async getStoredMetadata() {
    return DirectoryHandleStore.getStoredMetadata(this.guid);
  }

  async destroy() {
    await DirectoryHandleStore.removeHandle(this.guid);
    return super.destroy();
  }

  static async CreateWithDirectory(guid: string, indexCache?: TreeDirRootJType): Promise<OpFsDirMountDisk> {
    const disk = new OpFsDirMountDisk(guid, indexCache);
    await disk.selectDirectory();
    return disk;
  }
}
