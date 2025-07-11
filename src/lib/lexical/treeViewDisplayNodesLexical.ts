import { $isHeadingNode, HeadingNode } from "@lexical/rich-text";

import { lexical } from "@mdxeditor/editor";
// --- Unique ID Generator ---
let nodeIdCounter = 0;
function generateUniqueId(): string {
  return `view-node-${nodeIdCounter++}`;
}

export interface TreeViewNode {
  id: string; // Unique ID for React keys
  type: string;
  depth?: number; // For headings/sections
  displayText?: string; // The primary text to display for this node
  children?: TreeViewNode[];
  isContainer?: boolean; // Indicates if this node is a container (like a section or list)
  // You might add other properties as needed for your UI
  // E.g., iconType: 'paragraph' | 'heading' | 'code' etc.
  // E.g., originalNodeType: string;
}

function getLexicalTextContent(node: lexical.ElementNode): string {
  return node
    .getAllTextNodes()
    .map((textNode) => textNode.getTextContent())
    .join("");
  // let text = "";
  // for (const child of node.getChildren()) {
  //   if (child.getType() === "text") {
  //     text += (child as lexical.TextNode).getTextContent();
  //   } else if ("children" in child) {
  //     text += getLexicalTextContent(child);
  //   }
  // }
  // return text;
}
/**
 * Converts a Lexical content node (like paragraph, list) to a TreeViewNode.
 * This function is called for non-heading block-level nodes.
 */
function convertLexicalContentNode(
  lexicalNode: lexical.ElementNode,
  currentDepth: number,
  maxLength: number
): TreeViewNode | null {
  const displayText = getLexicalTextContent(lexicalNode);
  const truncatedText = displayText.length > maxLength ? `${displayText.slice(0, maxLength)}...` : displayText;

  const viewNode: TreeViewNode = {
    id: generateUniqueId(),
    type: lexicalNode.getType(),
    depth: currentDepth,
    displayText: truncatedText,
    isContainer: false, // Default for content nodes
  };

  switch (lexicalNode.getType()) {
    case "list":
      viewNode.isContainer = true;
      viewNode.displayText = "[list]";
      viewNode.children = (lexicalNode.getChildren() as lexical.ElementNode[])
        .map((child) => convertLexicalContentNode(child, currentDepth + 1, maxLength))
        .filter((n): n is TreeViewNode => n !== null);
      break;

    case "listitem":
      // List items are containers for their text and potential nested lists
      viewNode.isContainer = true;
      viewNode.displayText = `∙ ${truncatedText}`;
      if (lexicalNode.getChildren()?.some((child) => child.getType() === "list")) {
        viewNode.children = lexicalNode
          .getChildren()
          .map((child) => convertLexicalContentNode(child as lexical.ElementNode, currentDepth + 1, maxLength))
          .filter((n): n is TreeViewNode => n !== null);
      }
      break;

    case "paragraph":
    case "code":
    case "blockquote":
      // These are treated as leaf nodes in the tree view
      break;

    default:
      // Ignore unknown node types or return null if they shouldn't be in the tree
      return null;
  }

  return viewNode;
}

/**
 * Converts a Lexical RootNode into a hierarchical TreeViewNode structure,
 * creating a "sectionized" hierarchy based on headings.
 *
 * @param lexicalRoot The root node from a Lexical editor state.
 * @param maxHeadingLevel The maximum heading level to sectionize by (e.g., 6 for h1-h6).
 * @param maxLength The max length for displayText before truncating.
 * @returns The root TreeViewNode for display.
 */
export function lexicalToTreeView(lexicalRoot: lexical.RootNode, maxHeadingLevel = 6, maxLength = 32): TreeViewNode {
  nodeIdCounter = 0; // Reset counter for each new tree conversion

  const rootTreeViewNode: TreeViewNode = {
    id: generateUniqueId(),
    type: "root",
    displayText: "[document]",
    depth: 0,
    isContainer: true,
    children: [],
  };

  // The stack holds the current path of open sections (as TreeViewNodes).
  // It starts with the root. The last element is the current parent.
  const stack: TreeViewNode[] = [rootTreeViewNode];

  for (const lexicalNode of lexicalRoot.getChildren<lexical.ElementNode & HeadingNode>()) {
    // We only care about ElementNodes at the top level
    if (!lexicalNode.getChildrenSize()) continue;

    const currentParent = stack[stack.length - 1];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (currentParent && $isHeadingNode(lexicalNode as any)) {
      const headingNode = lexicalNode;
      const level = parseInt(headingNode.getTag().substring(1), 10);

      if (level > maxHeadingLevel) {
        // Treat headings deeper than max level as simple content
        const contentNode = convertLexicalContentNode(headingNode, (currentParent.depth || 0) + 1, maxLength);
        if (contentNode) {
          currentParent.children?.push(contentNode);
        }
        continue;
      }

      // Pop from stack until we find the correct parent level for this heading.
      // e.g., if we see an H2, and the stack top is an H3, we pop the H3.
      // if we see an H2, and the stack top is an H2, we pop the H2 to become siblings.
      while (stack.length > 1 && level <= (stack[stack.length - 1]?.depth ?? 0)) {
        stack.pop();
      }

      const newParent = stack[stack.length - 1];

      const sectionNode: TreeViewNode = {
        id: generateUniqueId(),
        type: "section", // We use 'section' to represent the group
        depth: level,
        displayText: getLexicalTextContent(headingNode),
        isContainer: true,
        children: [],
      };

      newParent?.children?.push(sectionNode);
      stack.push(sectionNode); // This heading is now the current section
    } else {
      // This is a content node (paragraph, list, etc.)
      const contentNode = convertLexicalContentNode(lexicalNode, (currentParent?.depth || 0) + 1, maxLength);
      if (contentNode) {
        currentParent?.children?.push(contentNode);
      }
    }
  }

  return rootTreeViewNode;
}
