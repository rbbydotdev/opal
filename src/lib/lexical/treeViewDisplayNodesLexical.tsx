import { Thumb } from "@/data/Thumb";
import { absPath, basename } from "@/lib/paths2";
import { $isHeadingNode, HeadingNode } from "@lexical/rich-text";

import { $isImageNode, lexical } from "@mdxeditor/editor";
// --- Unique ID Generator ---
let nodeIdCounter = 0;
function generateUniqueId(): string {
  return `view-node-${nodeIdCounter++}`;
}

export interface LexicalTreeViewNode {
  id: string; // Unique ID for React keys
  type: string;
  depth?: number; // For headings/sections
  displayText?: string | React.ReactElement; // The primary text to display for this node
  children?: LexicalTreeViewNode[];

  lexicalNodeId: string; // The original Lexical node ID for reference

  isContainer?: boolean; // Indicates if this node is a container (like a section or list)

  // You might add other properties as needed for your UI
  // E.g., iconType: 'paragraph' | 'heading' | 'code' etc.
  // E.g., originalNodeType: string;
}
export function isLeaf(node: LexicalTreeViewNode) {
  return node.isContainer === false;
}
export function isContainer(node: LexicalTreeViewNode) {
  return node.isContainer === true;
}

function getLexicalTextContent(node: lexical.LexicalNode): string {
  if (lexical.$isElementNode(node)) {
    return node.getTextContent();
  } else {
    return node.getType();
  }
}
/**
 * Converts a Lexical content node (like paragraph, list) to a TreeViewNode.
 * This function is called for non-heading block-level nodes.
 */
function convertLexicalContentNode(
  lexicalNode: lexical.ElementNode,
  currentDepth: number,
  maxLength: number
): LexicalTreeViewNode | null {
  const displayText = getLexicalTextContent(lexicalNode);
  const truncatedText = displayText.length > maxLength ? `${displayText.slice(0, maxLength)}...` : displayText;

  const viewNode: LexicalTreeViewNode = {
    id: generateUniqueId(),
    type: lexicalNode.getType(),
    depth: currentDepth,
    displayText: truncatedText,
    lexicalNodeId: lexicalNode.getKey(), // Store the original Lexical node ID for reference
    isContainer: false, // Default for content nodes
  };

  switch (lexicalNode.getType()) {
    case "list":
      viewNode.isContainer = true;
      viewNode.displayText = "[list]";
      viewNode.children = (lexicalNode.getChildren() as lexical.ElementNode[])
        .map((child) => convertLexicalContentNode(child, currentDepth + 1, maxLength))
        .filter((n): n is LexicalTreeViewNode => n !== null);
      break;
    case "paragraph":
      viewNode.isContainer = true;
      viewNode.displayText = "[paragraph]";
      viewNode.children = (lexicalNode.getChildren() as lexical.ElementNode[])
        .map((child) => convertLexicalContentNode(child, currentDepth + 1, maxLength))
        .filter((n): n is LexicalTreeViewNode => n !== null);
      break;

    case "image":
      if ($isImageNode(lexicalNode)) {
        viewNode.displayText = (
          <span title={displayText} className="text-xs flex justify-center items-center truncate w-full ">
            <img
              src={Thumb.pathToURL({ path: absPath(lexicalNode.getSrc()) })}
              alt={lexicalNode.getSrc()}
              className="mr-2 h-4 w-4 flex-shrink-0 border  border-background object-cover"
            />
            <span className="truncate w-full text-2xs">{`${basename(lexicalNode.getSrc())}`}</span>
          </span>
        );
      } else {
        viewNode.displayText = (
          <span title={displayText} className="text-xs">
            {`[image]`}
          </span>
        );
      }
      viewNode.isContainer = false;
      break;
    case "listitem":
      // List items are containers for their text and potential nested lists
      viewNode.isContainer = true;
      viewNode.displayText = `∙ ${truncatedText}`;
      if (lexicalNode.getChildren()?.some((child) => child.getType() === "list")) {
        viewNode.children = lexicalNode
          .getChildren()
          .filter((child) => child.getType() === "list") // Only include nested lists
          .map((child) => convertLexicalContentNode(child as lexical.ElementNode, currentDepth + 1, maxLength))
          .filter((n): n is LexicalTreeViewNode => n !== null);
      }
      break;

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
export function lexicalToTreeView(
  lexicalRoot: lexical.RootNode,
  maxHeadingLevel = 6,
  maxLength = 32
): LexicalTreeViewNode {
  nodeIdCounter = 0; // Reset counter for each new tree conversion

  const rootTreeViewNode: LexicalTreeViewNode = {
    id: generateUniqueId(),
    type: "root",
    displayText: "[document]",
    depth: 0,
    isContainer: true,
    children: [],
    lexicalNodeId: lexicalRoot.getKey(), // Store the original Lexical node ID for reference
  };

  // The stack holds the current path of open sections (as TreeViewNodes).
  // It starts with the root. The last element is the current parent.
  const stack: LexicalTreeViewNode[] = [rootTreeViewNode];

  for (const lexicalNode of lexicalRoot.getChildren<lexical.ElementNode & HeadingNode>()) {
    // We only care about ElementNodes at the top level
    if (!lexicalNode.getChildrenSize?.()) {
      continue;
    }

    const currentParent = stack.at(-1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (currentParent && $isHeadingNode(lexicalNode as any)) {
      const headingNode = lexicalNode;
      const level = parseInt(headingNode.getTag().substring(1), 10);

      if (level > maxHeadingLevel) {
        // Treat headings deeper than max level as simple content
        const contentNode = convertLexicalContentNode(headingNode, (currentParent.depth || 0) + 1, maxLength);
        if (contentNode) {
          // console.debug("Adding content node for deep heading:", contentNode);
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

      const newParent = stack[stack.length - 1]!;

      const sectionNode: LexicalTreeViewNode = {
        id: generateUniqueId(),
        type: "section", // We use 'section' to represent the group
        depth: level,
        displayText: getLexicalTextContent(headingNode),
        lexicalNodeId: headingNode.getKey(), // Store the original Lexical node ID for reference
        isContainer: true,
        children: [],
      };

      // console.debug("Adding section node:", sectionNode);
      newParent.children?.push(sectionNode);
      stack.push(sectionNode); // This heading is now the current section
      // console.log("stack", stack);
    } else {
      // console.debug("Processing content node:", lexicalNode.getType());
      const contentNode = convertLexicalContentNode(lexicalNode, (currentParent?.depth || 0) + 1, maxLength);
      if (contentNode) {
        currentParent?.children?.push(contentNode);
      }
    }
  }

  // console.log(JSON.stringify(rootTreeViewNode, null, 4));
  // console.log(rootTreeViewNode);
  return rootTreeViewNode;
}
