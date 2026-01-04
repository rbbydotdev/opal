import { LexicalTreeViewNode } from "@/components/sidebar/tree-view-section/treeViewDisplayNodesLexical";

/**
 * Checks if a tree node is a parent (container) node that can have children.
 * Parent nodes include sections, headings, lists, and other container types.
 *
 * @param node The tree node to check
 * @returns true if the node can contain children, false otherwise
 */
export function isParent(node: LexicalTreeViewNode): boolean {
  return Boolean(node.isContainer || node.children?.length);
}

/**
 * Checks if a tree node is specifically a list container.
 *
 * @param node The tree node to check
 * @returns true if the node is a list type, false otherwise
 */
export function isListContainer(node: LexicalTreeViewNode): boolean {
  return node.type === "list";
}

/**
 * Checks if a tree node is a list item.
 *
 * @param node The tree node to check
 * @returns true if the node is a list item, false otherwise
 */
export function isListItem(node: LexicalTreeViewNode): boolean {
  return node.type === "listitem";
}

/**
 * Checks if a tree node is a section or heading that defines document structure.
 *
 * @param node The tree node to check
 * @returns true if the node is a section or heading, false otherwise
 */
export function isSection(node: LexicalTreeViewNode): boolean {
  return node.type === "section" || node.type === "heading";
}