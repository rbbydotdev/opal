import { Disk } from "@/data/disk/Disk";
import { DefaultDiskType } from "@/data/disk/DiskDefaults";
import { DiskJType } from "@/data/DiskType";
import { CommonFileSystem } from "@/data/FileSystemTypes";
import { DexieFsDbDisk } from "@/data/disk/DexieFsDbDisk";
import { LocalStorageFsDisk } from "@/data/fs/LocalStorageFsDisk";
import { IndexedDbDisk } from "@/data/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { NullDisk } from "@/data/NullDisk";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { OpFsDisk } from "@/data/disk/OpFsDisk";
import { TreeDirRoot } from "@/lib/FileTree/TreeNode";

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
