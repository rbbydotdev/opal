import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { NullDiskContext } from "@/data/disk/NullDiskContext";
import { DiskType } from "@/data/DiskType";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

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
