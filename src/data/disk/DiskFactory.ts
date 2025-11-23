import { Disk } from "@/data/disk/Disk";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { OpFsDisk } from "@/data/disk/OpFsDisk";
import { DiskJType } from "@/data/DiskType";
import { CommonFileSystem } from "@/data/FileSystemTypes";
import { IndexedDbDisk } from "@/data/IndexedDbDisk";
import { NullDisk } from "@/data/NullDisk";
import { TreeDirRoot } from "@/lib/FileTree/TreeNode";

const DiskMap = {
  [IndexedDbDisk.type]: IndexedDbDisk,
  [NullDisk.type]: NullDisk,
  [OpFsDisk.type]: OpFsDisk,
  [OpFsDirMountDisk.type]: OpFsDirMountDisk,
};

// export { DefaultDiskType };
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
