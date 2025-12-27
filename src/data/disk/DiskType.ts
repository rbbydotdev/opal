import { TreeDirRootJType } from "@/components/filetree/TreeNode";
import { BrowserAbility } from "@/lib/BrowserAbility";

export type DiskJType = { guid: string; type: DiskType; indexCache?: TreeDirRootJType | null; timestamp?: number };

const DiskKinds = ["IndexedDbDisk", "OpFsDisk", "OpFsDirMountDisk", "NullDisk", "MemDisk"] as const;

type AbleDiskTypes = Exclude<DiskType, "MemDisk">;

export const getDiskTypeLabel = (type: AbleDiskTypes) => {
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
export const DiskLabelMap: Record<AbleDiskTypes, string> = {
  IndexedDbDisk: "IndexedDB (Recommended)",
  OpFsDisk: "OPFS (origin private file system)",
  OpFsDirMountDisk: "OPFS (mount to directory)",
  NullDisk: "Null",
  // MemDisk: "In-Memory",
};
export const DiskCanUseMap: Record<AbleDiskTypes, () => boolean> = {
  IndexedDbDisk: () => BrowserAbility.canUseIndexedDB(), //typeof indexedDB !== "undefined",
  OpFsDisk: () => BrowserAbility.canUseOPFS(),
  OpFsDirMountDisk: () => BrowserAbility.canUseOPFS() && "showDirectoryPicker" in window,
  NullDisk: () => true,
};

export type DiskType = (typeof DiskKinds)[number];
