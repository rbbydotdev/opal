import { isParent } from "@/components/filetree/isParent";
import { LexicalTreeViewNode } from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";

export const inorderWalk = (node: LexicalTreeViewNode, callback: (node: LexicalTreeViewNode) => void) => {
  callback(node);
  if (isParent(node) && node.children) {
    node.children.forEach((child) => inorderWalk(child, callback));
  }
};