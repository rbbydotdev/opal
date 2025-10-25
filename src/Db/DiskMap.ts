import { DexieFsDbDisk, LocalStorageFsDisk, MemDisk, NullDisk, OpFsDirMountDisk, OpFsDisk } from "@/Db/Disk";
import { IndexedDbDisk } from "@/Db/IndexedDbDisk";

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
