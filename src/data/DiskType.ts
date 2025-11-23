import { BrowserAbility } from "@/lib/BrowserAbility";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

export type DiskJType = { guid: string; type: DiskType; indexCache?: TreeDirRootJType | null; timestamp?: number };

export const DiskKinds = ["IndexedDbDisk", "OpFsDisk", "OpFsDirMountDisk", "NullDisk"] as const;

export type DiskTypes = (typeof DiskKinds)[number];

export const getDiskTypeLabel = (type: DiskTypes) => {
  return DiskKindLabel[type] ?? "Unknown";
};
export const DiskKindLabel: Record<DiskType, string> = {
  IndexedDbDisk: "IndexedDB",
  OpFsDisk: "OPFS",
  OpFsDirMountDisk: "OPFS Dir Mount",
  NullDisk: "Null",
};

export const DiskEnabledFSTypes = ["IndexedDbDisk", "OpFsDisk", "OpFsDirMountDisk"] as const;
export const DiskLabelMap: Record<DiskType, string> = {
  IndexedDbDisk: "IndexedDB (Recommended)",
  OpFsDisk: "OPFS (origin private file system)",
  OpFsDirMountDisk: "OPFS (mount to directory)",
  NullDisk: "Null",
};
export const DiskCanUseMap: Record<DiskType, () => boolean> = {
  IndexedDbDisk: () => BrowserAbility.canUseIndexedDB(), //typeof indexedDB !== "undefined",
  OpFsDisk: () => BrowserAbility.canUseOPFS(),
  OpFsDirMountDisk: () => BrowserAbility.canUseOPFS() && "showDirectoryPicker" in window,
  NullDisk: () => true,
};

export type DiskType = (typeof DiskKinds)[number];
