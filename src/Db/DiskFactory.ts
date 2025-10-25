import { CommonFileSystem } from "@/Db/FileSystemTypes";
import { Disk } from "@/Db/Disk";
import { DiskJType } from "@/Db/DiskType";
import { IndexedDbDisk } from "@/Db/IndexedDbDisk";
import { TreeDirRoot } from "@/lib/FileTree/TreeNode";
import { DexieFsDbDisk } from "@/Db/DexieFsDbDisk";
import { MemDisk } from "@/Db/MemDisk";
import { NullDisk } from "@/Db/NullDisk";
import { OpFsDirMountDisk } from "@/Db/OPFsDirMountDisk";
import { OpFsDisk } from "@/Db/OpFsDisk";
import { LocalStorageFsDisk } from "@/Db/LocalStorageFsDisk";
import { DefaultDiskType } from "@/Db/DiskDefaults";

const DiskMap = {
  [IndexedDbDisk.type]: IndexedDbDisk,
  [MemDisk.type]: MemDisk,
  [DexieFsDbDisk.type]: DexieFsDbDisk,
  [NullDisk.type]: NullDisk,
  [OpFsDisk.type]: OpFsDisk,
  [OpFsDirMountDisk.type]: OpFsDirMountDisk,
  [LocalStorageFsDisk.type]: LocalStorageFsDisk,
};

export { DefaultDiskType };
export function DiskFromJSON(
  json: DiskJType,
  fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
): Disk {
  return DiskFactory({ guid: json.guid, type: json.type, indexCache: json.indexCache }, fsTransform);
}

export function DiskFactory(
  { guid, type, indexCache }: DiskJType,
  fsTransform: (fs: CommonFileSystem) => CommonFileSystem = (fs) => fs
): Disk {
  if (!DiskMap[type]) throw new Error("invalid disk type " + type);
  const DiskConstructor = DiskMap[type] satisfies {
    new (guid: string): Disk; //TODO interface somewhere?
  };
  return new DiskConstructor(guid, indexCache ?? new TreeDirRoot(), fsTransform);
}
