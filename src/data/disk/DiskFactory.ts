import { TreeDirRoot } from "@/components/filetree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { DiskJType, DiskType } from "@/data/disk/DiskType";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { MemDisk } from "@/data/disk/MemDisk";
import { NullDisk } from "@/data/disk/NullDisk";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { OpFsDisk } from "@/data/disk/OpFsDisk";

const DiskMap = {
  [MemDisk.type]: MemDisk,
  [IndexedDbDisk.type]: IndexedDbDisk,
  [NullDisk.type]: NullDisk,
  [OpFsDisk.type]: OpFsDisk,
  [OpFsDirMountDisk.type]: OpFsDirMountDisk,
};

// export { DefaultDiskType };
export function DiskFromJSON(json: DiskJType): Disk {
  return DiskFactory({ guid: json.guid, type: json.type, indexCache: json.indexCache });
}

function DiskFactory({ guid, type, indexCache }: DiskJType): Disk {
  if (!DiskMap[type]) throw new Error("invalid disk type " + type);
  const DiskConstructor = DiskMap[type] satisfies {
    new (guid: string, indexCache: TreeDirRoot): Disk; //TODO interface somewhere?
  };
  return new DiskConstructor(guid, indexCache ?? new TreeDirRoot());
}

export function DiskFactoryByType(type: DiskType): Disk {
  if (!DiskMap[type]) throw new Error("invalid disk type " + type);
  const DiskConstructor = DiskMap[type] satisfies {
    new (guid: string, indexCache: TreeDirRoot): Disk;
  };
  return new DiskConstructor(Disk.guid(), new TreeDirRoot());
}
