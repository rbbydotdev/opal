import { TreeNode } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { RelPath } from "@/lib/paths2";

interface FrontMatter {
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
