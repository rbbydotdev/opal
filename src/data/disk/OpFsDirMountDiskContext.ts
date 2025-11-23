import { DiskContext } from "@/data/disk/DiskContext";
import { CommonFileSystem } from "@/data/FileSystemTypes";
import { MutexFs } from "@/data/fs/MutexFs";
import { PatchedDirMountOPFS } from "@/data/PatchedDirMountOPFS";
import { FileTree } from "@/lib/FileTree/Filetree";
import { Mutex } from "async-mutex";
import { IFileSystemDirectoryHandle } from "memfs/lib/fsa/types";

export class OpFsDirMountDiskContext extends DiskContext {
  constructor(fs: CommonFileSystem, fileTree: FileTree, mutex: Mutex) {
    super(fs, fileTree, mutex);
  }

  // static createTemp(guid: string): OpFsDirMountDiskContext {
  //   const mutex = new Mutex();
  //   const tempFs = NullFileSystem;
  //   void mutex.acquire(); // Will be released when real directory is set
  //   return new OpFsDirMountDiskContext(new MutexFs(tempFs, mutex), new FileTree(tempFs, guid, mutex), mutex);
  // }

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
