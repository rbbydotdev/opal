import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export const flatUniqNodeArgs = (nodes: (AbsPath | TreeNode | AbsPath[] | TreeNode[])[]) => [
  ...new Set(nodes.flat(Infinity).map((node) => String(node) as AbsPath)),
];
