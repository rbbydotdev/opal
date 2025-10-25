import { DexieFsDbDisk } from "@/Db/DexieFsDbDisk";
import { IndexedDbDisk } from "@/Db/IndexedDbDisk";
import { LocalStorageFsDisk } from "@/Db/LocalStorageFsDisk";
import { MemDisk } from "@/Db/MemDisk";
import { NullDisk } from "@/Db/NullDisk";
import { OpFsDirMountDisk } from "@/Db/OPFsDirMountDisk";
import { OpFsDisk } from "@/Db/OpFsDisk";

/*
TODO add mount dirs to disk
Give disk a mount map
mounts = Record<AbsPath, Disk>
*/

export const DiskMap = {
  [IndexedDbDisk.type]: IndexedDbDisk,
  [MemDisk.type]: MemDisk,
  [DexieFsDbDisk.type]: DexieFsDbDisk,
  [NullDisk.type]: NullDisk,
  [OpFsDisk.type]: OpFsDisk,
  [OpFsDirMountDisk.type]: OpFsDirMountDisk,
  [LocalStorageFsDisk.type]: LocalStorageFsDisk,
};
