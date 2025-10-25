import { BrowserAbility } from "@/lib/BrowserAbility";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

export type DiskJType = { guid: string; type: DiskType; indexCache?: TreeDirRootJType | null };

export const DiskKinds = [
  "IndexedDbDisk",
  "MemDisk",
  "DexieFsDbDisk",
  "NullDisk",
  "OpFsDisk",
  "OpFsDirMountDisk",
  "ZenWebstorageFSDbDisk",
  "LocalStorageFsDisk",
] as const;

export type DiskTypes = (typeof DiskKinds)[number];

export const getDiskTypeLabel = (type: DiskTypes) => {
  return DiskKindLabel[type] ?? "Unknown";
};
export const DiskKindLabel: Record<DiskType, string> = {
  IndexedDbDisk: "IndexedDB",
  MemDisk: "Memory",
  DexieFsDbDisk: "Dexie FS",
  NullDisk: "Null",
  OpFsDisk: "OPFS",
  OpFsDirMountDisk: "OPFS Dir Mount",
  ZenWebstorageFSDbDisk: "Zen Webstorage FS Db",
  LocalStorageFsDisk: "Local Storage FS",
};

export const DiskEnabledFSTypes = ["IndexedDbDisk", "OpFsDisk", "OpFsDirMountDisk"] as const;
export const DiskLabelMap: Record<DiskType, string> = {
  IndexedDbDisk: "IndexedDB (Recommended)",
  LocalStorageFsDisk: "Local Storage FS",
  MemDisk: "Memory",
  DexieFsDbDisk: "DexieFS",
  NullDisk: "Null",
  OpFsDisk: "OPFS (origin private file system)",
  OpFsDirMountDisk: "OPFS (mount to directory)",
  ZenWebstorageFSDbDisk: "ZenWebstorageFSDb",
};
export const DiskCanUseMap: Record<DiskType, () => boolean> = {
  MemDisk: () => true,
  NullDisk: () => true,
  LocalStorageFsDisk: () => BrowserAbility.canUseLocalStorage(),
  IndexedDbDisk: () => BrowserAbility.canUseIndexedDB(), //typeof indexedDB !== "undefined",
  DexieFsDbDisk: () => false, //typeof DexieFsDb !== "undefined",
  OpFsDisk: () => BrowserAbility.canUseOPFS(),
  OpFsDirMountDisk: () => BrowserAbility.canUseOPFS() && "showDirectoryPicker" in window,
  ZenWebstorageFSDbDisk: () => false, // typeof ZenWebstorageFSDb !== "undefined",
};

export type DiskType = (typeof DiskKinds)[number];
