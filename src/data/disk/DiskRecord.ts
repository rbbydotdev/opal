import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";
import { DiskType } from "@/data/DiskType";

export class DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache!: TreeDirRootJType | null;
}
