import { Disk } from "@/data/disk/Disk";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { IndexedDbDiskContext } from "@/data/disk/IndexedDbDiskContext";
import { DiskType } from "@/data/DiskType";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

export class IndexedDbDisk extends Disk<IndexedDbDiskContext> {
  static type: DiskType = "IndexedDbDisk";
  type = IndexedDbDisk.type;

  constructor(
    public readonly guid: string,
    indexCache?: TreeDirRootJType,
    context?: IndexedDbDiskContext
  ) {
    const ctx = context ?? IndexedDbDiskContext.create(guid, indexCache);
    super(guid, ctx.fs, ctx.fileTree, DiskDAO.New(IndexedDbDisk.type, guid, indexCache));
    this._context = ctx;
    this.ready = ctx.lightningFs.init(guid) as unknown as Promise<void>;
  }

  async setDiskContext(newContext: IndexedDbDiskContext): Promise<void> {
    await super.setDiskContext(newContext);
    this.ready = newContext.lightningFs.init(this.guid) as unknown as Promise<void>;
  }
}
