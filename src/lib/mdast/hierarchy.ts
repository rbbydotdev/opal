import { isParent } from "@/components/isParent";
import { getTextContent } from "@/lib/mdast/mdastUtils";
import mdast, { Content, Heading, Root } from "mdast";

class HierNode {
  children: HierNode[] = [];
  type = "#p" as const;
  label: string;
  id: string;
  content: string;
  constructor(
    public ref: mdast.Parent,
    public depth: number
  ) {
    this.id = ref.position?.start?.line + "-" + ref.position?.start?.column;
    this.label = ref.type;
    this.content = getTextContent(ref);
  }
}

export function createPageHierarchy222(mdastRoot: Root): HierNode {
  const root = new HierNode(mdastRoot, 0);

  const stack: HierNode[] = [];

  for (const node of mdastRoot.children) {
    if (node.type === "heading") {
      //get text content of the heading
      const hierNode = new HierNode(node, node.depth);

      // Find the correct parent in the stack. We pop parents off the stack
      // as long as their heading level is equal to or deeper than the
      // current heading's level. This correctly handles moving "up" the
      // hierarchy (e.g., from an H3 back to a new H2).
      while (stack.length > 0 && stack.at(-1)!.depth >= node.depth) {
        stack.pop();
      }

      // The new parent is now at the top of the stack.
      const currentHier = stack.length > 0 ? stack.at(-1) : null;

      if (currentHier) currentHier.children.push(hierNode);
      else {
        // If there's no parent, it's a top-level heading.
        root.children.push(hierNode);
      }

      // Push the new heading onto the stack, making it the new
      // parent context for all subsequent nodes.
      stack.push(hierNode);
    } else {
      // This node is NOT a heading (e.g., paragraph, list, code block).
      // It belongs to the most recent heading we've encountered.
      const parent = stack.length > 0 ? stack.at(-1) : null;

      if (parent) {
        // Add the content node as a child of the current heading's section.

        if (isParent(node)) {
          parent.children.push(new HierNode(node, parent.depth + 1)); // Assuming depth 0 for non-heading parents
        }
      } else {
        // If we haven't seen any headings yet, this is top-level content.
        root.children.push(new HierNode(node as mdast.Parent /*?*/, 0));
      }
    }
  }

  return root;
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
