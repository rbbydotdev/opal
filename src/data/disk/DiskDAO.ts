import { TreeDirRoot, TreeDirRootJType } from "@/components/filetree/TreeNode";
import { DefaultDiskType } from "@/data/disk/DiskDefaults";
import { DiskRecord } from "@/data/disk/DiskRecord";
import { DiskJType, DiskType } from "@/data/disk/DiskType";
import { ClientDb } from "@/data/instance";
import { nanoid } from "nanoid";

export class DiskDAO {
  guid: string;
  type: DiskType;
  indexCache: TreeDirRootJType | null;
  timestamp?: number;
  static guid = () => "__disk__" + nanoid();

  constructor({ guid, type, indexCache, timestamp }: Optional<DiskRecord, "indexCache">) {
    this.indexCache = indexCache ?? new TreeDirRoot().toJSON();
    this.guid = guid;
    this.type = type;
    this.timestamp = timestamp;
  }

  static FromJSON(json: DiskJType) {
    return new DiskDAO(json);
  }

  toJSON({ includeIndexCache = true }: { includeIndexCache?: boolean } = {}) {
    return {
      guid: this.guid,
      type: this.type,
      timestamp: this.timestamp,
      ...(includeIndexCache ? { indexCache: this.indexCache } : {}),
    };
  }

  static CreateNew(type: DiskType = DefaultDiskType) {
    return new DiskDAO({ type: type, guid: DiskDAO.guid(), timestamp: Date.now() });
  }

  static New(type: DiskType, guid: string, indexCache?: TreeDirRootJType) {
    return new DiskDAO({ type, guid, indexCache, timestamp: Date.now() });
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

  static async all() {
    const disks = await ClientDb.disks.orderBy("timestamp").toArray();
    return disks.map((disk) => DiskDAO.FromJSON(disk));
  }

  updateIndexCache(indexCache: TreeDirRoot) {
    this.indexCache = indexCache.toJSON();
  }

  save() {
    return ClientDb.disks.put({
      guid: this.guid,
      type: this.type,
      indexCache: this.indexCache,
      timestamp: this.timestamp,
    });
  }

  delete() {
    return ClientDb.disks.delete(this.guid);
  }
  static delete(guid: string) {
    return ClientDb.disks.delete(guid);
  }
}
