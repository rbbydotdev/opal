import { FileTree } from "@/components/filetree/Filetree";
import { TreeDirRootJType } from "@/components/filetree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { DiskContext } from "@/data/disk/DiskContext";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskType } from "@/data/disk/DiskType";
import { CommonFileSystem, NullFileSystem } from "@/data/fs/FileSystemTypes";
import { Mutex } from "async-mutex";

export class NullDiskContext extends DiskContext {
  constructor(fs: CommonFileSystem, fileTree: FileTree, mutex: Mutex) {
    super(fs, fileTree, mutex);
  }

  static create(guid: string = "__disk__NullDisk"): NullDiskContext {
    const fs = NullFileSystem;
    const mutex = new Mutex();
    const fileTree = new FileTree(fs, guid, mutex);

    return new NullDiskContext(fs, fileTree, mutex);
  }

  async tearDown(): Promise<void> {
    // NullFileSystem doesn't require cleanup
  }
}

export class NullDisk extends Disk<NullDiskContext> {
  static type: DiskType = "NullDisk";
  type = NullDisk.type;
  ready = new Promise<void>(() => {}); //never resolves since subsequent ops will fail

  constructor(
    public readonly guid = "__disk__NullDisk",
    _indexCache?: TreeDirRootJType,
    context?: NullDiskContext
  ) {
    const ctx = context ?? NullDiskContext.create(guid);
    super("__disk__NullDisk", ctx.fs, ctx.fileTree, DiskDAO.New(NullDisk.type, guid));
    this._context = ctx;
  }

  async init() {
    return () => {};
  }
}
