import { DiskType } from "@/Db/Disk";
import { TreeDirRootJType } from "@/lib/FileTree/TreeNode";

export class DiskRecord {
  guid!: string;
  type!: DiskType;
  indexCache!: TreeDirRootJType | null;
}
