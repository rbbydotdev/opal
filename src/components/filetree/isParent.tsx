import { LexicalTreeViewNode } from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";

export const isParent = (
  node: LexicalTreeViewNode
): node is LexicalTreeViewNode & { children: LexicalTreeViewNode[] } => {
  return (node as any).children !== undefined;
};
