import { TreeDirRootJType } from "@/components/sidebar/FileTree/TreeNode";
import { DiskType } from "@/data/disk/DiskType";

export class DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache!: TreeDirRootJType | null;
  timestamp?: number;
}
