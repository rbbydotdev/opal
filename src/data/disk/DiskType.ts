import { TreeDirRootJType } from "@/components/filetree/TreeNode";
import { BrowserAbility } from "@/lib/BrowserAbility";

export type DiskJType = { guid: string; type: DiskType; indexCache?: TreeDirRootJType | null; timestamp?: number };

const DiskKinds = ["IndexedDbDisk", "OpFsDisk", "OpFsDirMountDisk", "NullDisk", "MemDisk"] as const;

export const getDiskTypeLabel = (type: DiskType) => {
  return DiskKindLabel[type] ?? "Unknown";
};
export const DiskKindLabel: Record<DiskType, string> = {
  IndexedDbDisk: "IndexedDB",
  OpFsDisk: "OPFS",
  OpFsDirMountDisk: "OPFS Dir Mount",
  NullDisk: "Null",
  MemDisk: "Memory",
};

export const DiskEnabledFSTypes = ["IndexedDbDisk", "OpFsDisk", "OpFsDirMountDisk"] as const;
export type DiskEnabledFSType = (typeof DiskEnabledFSTypes)[number];

export const DiskLabelMap: Record<DiskType, string> = {
  IndexedDbDisk: "IndexedDB (Recommended)",
  OpFsDisk: "OPFS (origin private file system)",
  OpFsDirMountDisk: "OPFS (mount to directory)",
  NullDisk: "Null",
  MemDisk: "Memory",
};
export const DiskCanUseMap: Record<DiskEnabledFSType, () => boolean> = {
  IndexedDbDisk: () => BrowserAbility.canUseIndexedDB(), //typeof indexedDB !== "undefined",
  OpFsDisk: () => BrowserAbility.canUseOPFS(),
  OpFsDirMountDisk: () => BrowserAbility.canUseOPFS() && "showDirectoryPicker" in window,
};

export type DiskType = (typeof DiskKinds)[number];
