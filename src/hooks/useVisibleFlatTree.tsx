import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { Workspace } from "@/lib/events/Workspace";
import { AbsPath } from "@/lib/paths2";
import { useMemo } from "react";

export function useVisibleFlatTree({
  flatTree,
  treeExpander,
  currentWorkspace,
}: {
  flatTree: AbsPath[];
  treeExpander: ReturnType<typeof useTreeExpanderContext> | null;
  currentWorkspace: Workspace;
}) {
  return useMemo(() => {
    if (!treeExpander) {
      // If no tree expander context, return all items
      return flatTree;
    }

    return flatTree.filter((path) => {
      // Skip root directory - it's not a navigable item
      if (path === "/") return false;

      const node = currentWorkspace.nodeFromPath(path);
      if (!node) return false;

      // Check if all parent directories are expanded
      let parentNode = node.parent;
      while (parentNode && parentNode.path !== "/") {
        if (!treeExpander.isExpanded(parentNode.path)) {
          return false;
        }
        parentNode = parentNode.parent;
      }

      return true;
    });
  }, [flatTree, treeExpander, currentWorkspace]);
}
