import { Disk } from "@/Db/Disk";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, RelPath } from "@/lib/paths2";

export type BuildStrategy = "freeform" | "book" | "blog";

export interface BuildOptions {
  strategy: BuildStrategy;
  sourceDisk: Disk;
  outputDisk: Disk;
  sourcePath: AbsPath;
  outputPath: AbsPath;
  onLog?: (message: string) => void;
  onError?: (error: string) => void;
}

export interface FrontMatter {
  layout?: string;
  title?: string;
  summary?: string;
  styles?: string[];
  scripts?: string[];
  [key: string]: any;
}

export interface PageData {
  path: RelPath;
  content: string;
  frontMatter: FrontMatter;
  htmlContent: string;
  node: TreeNode;
}