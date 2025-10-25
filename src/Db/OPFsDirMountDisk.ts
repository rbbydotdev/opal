import { CommonFileSystem } from "@/Db/FileSystemTypes";
import { DirectoryHandleStore } from "@/Db/DirectoryHandleStore";
import { Disk } from "@/Db/Disk";
import { DiskDAO } from "@/Db/DiskDAO";
import { DiskType } from "@/Db/DiskType";
import { MutexFs } from "@/Db/MutexFs";
import { PatchedDirMountOPFS } from "@/Db/PatchedDirMountOPFS";
import { FileTree } from "@/lib/FileTree/Filetree";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { Mutex } from "async-mutex";
import { memfs } from "memfs";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";
export class OpFsDirMountDisk extends Disk {
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
    private fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
  ) {
    const mutex = new Mutex();
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // Initialize with a temporary memfs until directory is selected
    const tempFs = memfs().fs;
    void mutex.acquire();
    super(
      guid,
      new MutexFs(tempFs.promises, mutex),
      new FileTree(tempFs.promises, guid, mutex),
      DiskDAO.New(OpFsDirMountDisk.type, guid, indexCache)
    );

    this.ready = promise;

    // Try to restore directory handle from storage
    this.initializeFromStorage()
      .then(() => {
        mutex.release();
        resolve();
      })
      .catch(reject);
  }

  private async initializeFromStorage(): Promise<void> {
    // console.log("🔄 Initializing from storage for disk:", this.guid);
    const handle = await DirectoryHandleStore.getHandle(this.guid);
    if (handle) {
      // console.log("✅ Found stored handle:", handle.name);
      await this.setDirectoryHandle(handle, true); // Skip storage when restoring
      // console.log("✅ Initialization from storage complete");
    } else {
      // console.log("ℹ️ No stored handle found for disk:", this.guid);
    }
  }

  async setDirectoryHandle(handle: FileSystemDirectoryHandle, skipStorage = false): Promise<void> {
    const previousHandle = this.directoryHandle;
    this.directoryHandle = handle;
    const shouldStore = !skipStorage && (!previousHandle || previousHandle.name !== handle.name);
    if (shouldStore) await DirectoryHandleStore.storeHandle(this.guid, handle);
    const patchedDirMountOPFS = this.fsTransform(
      new PatchedDirMountOPFS(Promise.resolve(handle) as unknown as Promise<IFileSystemDirectoryHandle>)
    );
    const mutex = new Mutex();
    const mutexFs = new MutexFs(patchedDirMountOPFS, mutex);
    const ft = new FileTree(patchedDirMountOPFS, this.guid, mutex);
    (this as any).fs = mutexFs;
    (this as any).fileTree = ft;
  }

  async selectDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!("showDirectoryPicker" in window)) {
      throw new Error("Directory picker not supported in this browser");
    }
    const handle = await (window as any).showDirectoryPicker({
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
