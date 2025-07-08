import { getTextContent, isParent } from "@/lib/mdast/mdastUtils";
import { toString } from "mdast-util-to-string";
import type { Node } from "unist";

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

export function isLeaf(node: TreeViewNode) {
  return node.isContainer === false;
}
export function isContainer(node: TreeViewNode) {
  return node.isContainer === true;
}

// --- Function to generate unique IDs for DisplayNodes ---
let nodeIdCounter = 0;
function generateUniqueId(): string {
  return `node-${nodeIdCounter++}`;
}

// --- Function to convert raw AST Node to simplified DisplayNode ---
export function convertTreeViewTree(node: Node, depth = 0, maxLength = 32): TreeViewNode | null {
  // Reset counter when starting a new tree conversion (e.g., from 'root')
  if (node.type === "root") {
    nodeIdCounter = 0;
  }

  const displayNode: TreeViewNode = {
    id: generateUniqueId(),
    type: node.type,
    isContainer: isContainerType(node.type),
  };

  // Copy depth property if it exists
  if ("depth" in node && typeof node.depth === "number") {
    displayNode.depth = node.depth;
  } else {
    displayNode.depth = depth; // Use the provided depth parameter instead
  }

  // Handle specific node types for display purposes
  switch (node.type) {
    // break;
    case "section":
      if (isParent(node)) {
        // displayNode.isContainer = true; // Mark as a container node
        const sectionText = toString(node.children[0]!);
        node.children = node.children.slice(1);
        // node.children = node.children.slice(1);
        const sectionTruncatedText =
          sectionText.length > maxLength ? `${sectionText.slice(0, maxLength)}...` : sectionText; // Truncate for display
        displayNode.displayText = sectionTruncatedText;
      }
      break;

    case "list":
      displayNode.displayText = "[list]";
      // displayNode.isContainer = true; // Mark as a container node
      break;
    case "listItem":
      // displayNode.isContainer = true; // Mark as a container node
      // displayNode.isContainer = false; // Mark as a container node
      displayNode.displayText = "∙ " + getTextContent(node);
      break;
    // For list items, we can use the first child text as the display text
    case "root":
    case "blockquote":
    case "table":
    case "tableRow":
      displayNode.displayText = "[" + node.type + "]";
      // displayNode.isContainer = true; // Mark as a container node
      // These are structural containers; their children will be processed recursively.
      // They typically don't have direct displayable text themselves in this simplified view.

      // return displayNode;
      break;
    case "paragraph":
    case "heading":
    case "text":
    case "code":
    case "html":
    case "thematicBreak":
    case "definition":
    case "footnoteDefinition":
    case "tableCell":
    case "strong":
    case "emphasis":
    case "link":
      // displayNode.isContainer = false; // Not a container, but a leaf node
      // For these types, flatten their text content into displayText.
      const text = toString(node);
      const truncatedText = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text; // Truncate for display
      displayNode.displayText = truncatedText;
      return displayNode;
    default:
      displayNode.isContainer = false; // Not a container, but a leaf node
      const defaultText = toString(node);
      const defaultTruncatedText =
        defaultText.length > maxLength ? `${defaultText.slice(0, maxLength)}...` : defaultText; // Truncate for display
      displayNode.displayText = defaultTruncatedText;
      break;
  }

  // Recursively convert children for container nodes
  if ("children" in node && Array.isArray(node.children)) {
    const convertedChildren = (node.children as Node[])
      .filter(Boolean)
      .map((child) => convertTreeViewTree(child, depth + 1))
      .filter(Boolean) as TreeViewNode[];
    if (convertedChildren.length > 0) {
      displayNode.children = convertedChildren;
    }
  }

  return displayNode;
}

function isContainerType(type: string): boolean {
  switch (type) {
    case "section":
    case "list":
    case "listItem":
    case "root":
    case "blockquote":
    case "table":
    case "tableRow":
      return true;
    case "paragraph":
    case "heading":
    case "text":
    case "code":
    case "html":
    case "thematicBreak":
    case "definition":
    case "footnoteDefinition":
    case "tableCell":
    case "strong":
    case "emphasis":
    case "link":
      return false;
    default:
      // Default to treating unknown types as leaf nodes
      return false;
  }
}
