import { OPFSNamespacedFs } from "@/data/CommonFileSystem";
import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { OpFsDiskContext } from "@/data/disk/OpFsDiskContext";
import { DiskType } from "@/data/DiskType";
import { ClientDb } from "@/data/instance";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

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
