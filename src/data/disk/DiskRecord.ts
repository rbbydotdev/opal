import { DiskType } from "@/data/disk/DiskType";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

export class DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache!: TreeDirRootJType | null;
  timestamp?: number;
}
