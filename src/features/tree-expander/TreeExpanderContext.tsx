import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { TreeExpanderValue } from "@/features/tree-expander/TreeExpanderTypes";
import { useTreeExpander } from "@/features/tree-expander/useTreeExpander";
import { createContext, ReactNode } from "react";

const defaultExpander: TreeExpanderValue = {
  expandSingle: (_path: string, _expanded: boolean) => {},
  expanded: {},
  setExpandAll: (_state: boolean) => {},
  expanderId: "",
  expandForNode: (_node, _state: boolean) => {},
  isExpanded: (_node) => false,
};

export const TreeExpanderContext = createContext<TreeExpanderValue>(defaultExpander);

export function TreeExpanderProvider({ children, id }: { children: ReactNode; id: string }) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;

  // Import the hook dynamically to avoid circular dependency
  const value = useTreeExpander({ nodePaths: flatTree, activePath: workspaceRoute.path, expanderId });
  return <TreeExpanderContext.Provider value={value}>{children}</TreeExpanderContext.Provider>;
}
