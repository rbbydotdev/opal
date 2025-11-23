import { DiskContext } from "@/data/disk/DiskContext";
import { CommonFileSystem, NullFileSystem } from "@/data/FileSystemTypes";
import { FileTree } from "@/lib/FileTree/Filetree";
import { Mutex } from "async-mutex";

export class NullDiskContext extends DiskContext {
  constructor(
    fs: CommonFileSystem,
    fileTree: FileTree,
    mutex: Mutex
  ) {
    super(fs, fileTree, mutex);
  }

  static create(
    guid: string = "__disk__NullDisk"
  ): NullDiskContext {
    const fs = NullFileSystem;
    const mutex = new Mutex();
    const fileTree = new FileTree(fs, guid, mutex);

    return new NullDiskContext(fs, fileTree, mutex);
  }

  async tearDown(): Promise<void> {
    // NullFileSystem doesn't require cleanup
  }
}