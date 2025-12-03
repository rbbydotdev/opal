import { Disk } from "@/data/disk/Disk";
import { DiskJType } from "@/data/disk/DiskType";
import { IndexedDbDisk } from "@/data/disk/IndexedDbDisk";
import { NullDisk } from "@/data/disk/NullDisk";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { OpFsDisk } from "@/data/disk/OpFsDisk";
import { TreeDirRoot } from "@/lib/FileTree/TreeNode";

const DiskMap = {
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
    new (guid: string): Disk; //TODO interface somewhere?
  };
  return new DiskConstructor(guid, indexCache ?? new TreeDirRoot());
}
