import mdast, { Content, Heading, Root } from "mdast";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

//TODO rewrite this:

interface PNode {
  children: (PNode | CNode)[];
  type: "#p";
  ref: mdast.Node;
}

interface CNode {
  type: "#c";
  ref: mdast.Node;
}

export interface HierarchyNode {
  type: "hierarchyNode";
  heading: Heading;
  depth: number; // The depth of the heading (1 for H1, 2 for H2, etc.)
  label: string; // The text content of the heading
  children: (HierarchyNode | Content)[];
  position: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
}
type RequiredPosition = {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
};

export interface HierarchyRoot {
  type: "hierarchyRoot";
  children: (HierarchyNode | Content)[];
  position: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
}

export function isHierarchyNode(node: mdast.Node | HierarchyNode): node is HierarchyNode {
  return node.type === "hierarchyNode";
}

// --- PARSING FUNCTION ---

export function getMdastSync(source: string): Root {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

  return processor.parse(source);
}

export function getTextContent(node: mdast.Node): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  } else if ("children" in node && Array.isArray((node as mdast.Parent).children)) {
    return ((node as mdast.Parent).children as mdast.Node[]).map(getTextContent).join("");
  }
  return "";
}

/**
 * Transforms a flat MDAST tree into a nested hierarchy based on headings.
 * All content following a heading (paragraphs, lists, etc.) becomes a child
 * of that heading's node until a new heading of equal or higher level is found.
 *
 * @param mdastRoot The root of the MDAST tree from remark-parse.
 * @returns A new root node representing the nested page hierarchy.
 */
export function createPageHierarchy(mdastRoot: Root): HierarchyRoot {
  const hierarchyRoot: HierarchyRoot = {
    type: "hierarchyRoot",
    children: [],
    position: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    },
  };

  // The stack holds the current chain of parent HierarchyNodes.
  // The last item is the immediate parent for any new content or sub-headings.
  const parentStack: HierarchyNode[] = [];

  for (const node of mdastRoot.children) {
    if (node.type === "heading") {
      //get text content of the heading
      const textContent = getTextContent(node);
      const newHierarchyNode: HierarchyNode = {
        type: "hierarchyNode",
        label: textContent,
        depth: node.depth,
        heading: node,
        children: [],
        position: node.position as RequiredPosition, // Preserve position for potential use
      };

      // Find the correct parent in the stack. We pop parents off the stack
      // as long as their heading level is equal to or deeper than the
      // current heading's level. This correctly handles moving "up" the
      // hierarchy (e.g., from an H3 back to a new H2).
      while (parentStack.length > 0 && parentStack[parentStack.length - 1]!.heading.depth >= node.depth) {
        parentStack.pop();
      }

      // The new parent is now at the top of the stack.
      const currentParent = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;

      if (currentParent) {
        currentParent.children.push(newHierarchyNode);
      } else {
        // If there's no parent, it's a top-level heading.
        hierarchyRoot.children.push(newHierarchyNode);
      }

      // Push the new heading onto the stack, making it the new
      // parent context for all subsequent nodes.
      parentStack.push(newHierarchyNode);
    } else {
      // This node is NOT a heading (e.g., paragraph, list, code block).
      // It belongs to the most recent heading we've encountered.
      const currentParent = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;

      if (currentParent) {
        // Add the content node as a child of the current heading's section.
        currentParent.children.push(node);
      } else {
        // If we haven't seen any headings yet, this is top-level content.
        hierarchyRoot.children.push(node);
      }
    }
  }

  return hierarchyRoot;
}
