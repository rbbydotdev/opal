import { isParent } from "@/components/MdastTreeMenu";
import { toString } from "mdast-util-to-string";
import type { Node } from "unist";

export interface TreeViewNode {
  id: string; // Unique ID for React keys
  type: string;
  depth?: number; // For headings/sections
  displayText?: string; // The primary text to display for this node
  children?: TreeViewNode[];
  // You might add other properties as needed for your UI
  // E.g., iconType: 'paragraph' | 'heading' | 'code' etc.
  // E.g., originalNodeType: string;
}

// --- Function to generate unique IDs for DisplayNodes ---
let nodeIdCounter = 0;
function generateUniqueId(): string {
  return `node-${nodeIdCounter++}`;
}

// --- Function to convert raw AST Node to simplified DisplayNode ---
export function convertTreeViewTree(node: Node, maxLength = 32): TreeViewNode | null {
  // Reset counter when starting a new tree conversion (e.g., from 'root')
  if (node.type === "root") {
    nodeIdCounter = 0;
  }

  const displayNode: TreeViewNode = {
    id: generateUniqueId(),
    type: node.type,
  };

  // Copy depth property if it exists
  if ("depth" in node && typeof node.depth === "number") {
    displayNode.depth = node.depth;
  }

  // Handle specific node types for display purposes
  switch (node.type) {
    case "list":
    case "listItem":
    case "section":
      if (isParent(node)) {
        if (isParent(node.children?.[0]) && node.children[0].children.length > 1) {
          Object.assign(node, node.children[0]);
          //   // node.children[0].children = node.children[0].children.slice(1); // Only take the first child for display
        }
        // const sectionText = toString(node.children[0]!);
        // node.children = node.children.slice(0);

        // const sectionTruncatedText =
        //   sectionText.length > maxLength ? `${sectionText.slice(0, maxLength)}...` : sectionText; // Truncate for display
        // displayNode.displayText = sectionTruncatedText;
        break;
      }
    case "root":
    case "listItem":
    case "blockquote":
    case "table":
    case "tableRow":
      // These are structural containers; their children will be processed recursively.
      // They typically don't have direct displayable text themselves in this simplified view.
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
      // For these types, flatten their text content into displayText.
      const text = toString(node);
      const truncatedText = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text; // Truncate for display
      displayNode.displayText = truncatedText;
      return displayNode;
    default:
      const defaultText = toString(node);
      const defaultTruncatedText =
        defaultText.length > maxLength ? `${defaultText.slice(0, maxLength)}...` : defaultText; // Truncate for display
      displayNode.displayText = defaultTruncatedText;
      break;
  }

  // Recursively convert children for container nodes
  if ("children" in node && Array.isArray(node.children)) {
    const convertedChildren = (node.children as Node[])
      .map((child) => convertTreeViewTree(child))
      .filter(Boolean) as TreeViewNode[];
    if (convertedChildren.length > 0) {
      displayNode.children = convertedChildren;
    }
  }

  return displayNode;
}
