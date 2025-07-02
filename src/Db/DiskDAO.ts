import { Disk, DiskJType, DiskType } from "@/Db/Disk";
import { DiskRecord } from "@/Db/DiskRecord";
import { ClientDb } from "@/Db/instance";
import { TreeDirRoot, TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { nanoid } from "nanoid";

export class DiskDAO {
  guid: string;
  type: DiskType;
  indexCache: TreeDirRootJType;
  static guid = () => "__disk__" + nanoid();

  constructor(disk: Optional<DiskRecord, "indexCache">) {
    this.indexCache = disk.indexCache ?? new TreeDirRoot().toJSON();
    this.guid = disk.guid;
    this.type = disk.type;
  }

  static FromJSON(json: DiskJType) {
    return new DiskDAO(json);
  }

  toJSON({ includeIndexCache = true }: { includeIndexCache?: boolean } = {}) {
    return {
      guid: this.guid,
      type: this.type,
      ...(includeIndexCache ? { indexCache: this.indexCache } : {}),
    };
  }

  static CreateNew(type: DiskType = Disk.defaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid() });
  }

  static New(type: DiskType, guid: string, indexCache?: TreeDirRootJType) {
    return new DiskDAO({ type, guid, indexCache });
  }

  static FetchFromGuid(guid: string) {
    return ClientDb.disks.where("guid").equals(guid).first();
  }

  async hydrate() {
    Object.assign(this, await DiskDAO.FetchFromGuid(this.guid));
    return this;
  }
  update(properties: Partial<DiskRecord>) {
    this.indexCache = properties.indexCache ?? this.indexCache;
    //this.guid cannot update
    //this.type cannot update
    return ClientDb.disks.update(this.guid, properties);
  }

  updateIndexCache(indexCache: TreeDirRoot) {
    this.indexCache = indexCache.toJSON();
  }

  save() {
    return ClientDb.disks.put({
      guid: this.guid,
      type: this.type,
      indexCache: this.indexCache,
    });
  }

  toModel() {
    return Disk.FromJSON(this);
  }
  delete() {
    return ClientDb.disks.delete(this.guid);
  }
}
