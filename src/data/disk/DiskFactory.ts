import { Disk } from "@/data/disk/Disk";
import { OpFsDirMountDisk } from "@/data/disk/OPFsDirMountDisk";
import { OpFsDisk } from "@/data/disk/OpFsDisk";
import { DiskJType } from "@/data/DiskType";
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
export function DiskFromJSON(json: DiskJType): Disk {
  return DiskFactory({ guid: json.guid, type: json.type, indexCache: json.indexCache });
}

export function DiskFactory({ guid, type, indexCache }: DiskJType): Disk {
  if (!DiskMap[type]) throw new Error("invalid disk type " + type);
  const DiskConstructor = DiskMap[type] satisfies {
    new (guid: string): Disk; //TODO interface somewhere?
  };
  return new DiskConstructor(guid, indexCache ?? new TreeDirRoot());
}

//>>>>> NOT USED ANYMORE, KEEP FOR REFERENCE <<<<<
// // Type mapping for contexts
// type DiskContextMap = {
//   IndexedDbDisk: IndexedDbDiskContext;
//   NullDisk: NullDiskContext;
//   OpFsDisk: OpFsDiskContext;
//   OpFsDirMountDisk: OpFsDirMountDiskContext;
// };

// type DiskTypeMap = {
//   IndexedDbDisk: IndexedDbDisk;
//   NullDisk: NullDisk;
//   OpFsDisk: OpFsDisk;
//   OpFsDirMountDisk: OpFsDirMountDisk;
// };

// // New context-based factory method with generics
// export function DiskFromContext<T extends keyof DiskContextMap>(
//   diskType: T,
//   guid: string,
//   context: DiskContextMap[T],
//   indexCache?: DiskJType["indexCache"]
// ): DiskTypeMap[T] {
//   const indexCacheResolved = indexCache ?? new TreeDirRoot();

//   switch (diskType) {
//     case "IndexedDbDisk":
//       return new IndexedDbDisk(guid, indexCacheResolved, context as IndexedDbDiskContext) as DiskTypeMap[T];
//     case "NullDisk":
//       return new NullDisk(guid, indexCacheResolved, context as NullDiskContext) as DiskTypeMap[T];
//     case "OpFsDisk":
//       return new OpFsDisk(guid, indexCacheResolved, context as OpFsDiskContext) as DiskTypeMap[T];
//     case "OpFsDirMountDisk":
//       return new OpFsDirMountDisk(guid, indexCacheResolved, context as OpFsDirMountDiskContext) as DiskTypeMap[T];
//     default:
//       diskType satisfies never;
//       throw new Error("invalid disk type " + diskType);
//   }
// }
