import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useTreeExpander } from "@/features/tree-expander/useTreeExpander";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { createContext, ReactNode } from "react";

const defaultExpander = {
  expandSingle: (_path: string, _expanded: boolean) => {},
  expanded: {},
  setExpandAll: (_state: boolean) => {},
  expanderId: "",
  expandForNode: (_node: TreeNode, _state: boolean) => {},
  isExpanded: (_node: string | TreeNode) => false,
};

type TreeExpanderContextType = ReturnType<typeof useTreeExpander>;
export const TreeExpanderContext = createContext<TreeExpanderContextType>(defaultExpander);

export function TreeExpanderProvider({ children, id }: { children: ReactNode; id: string }) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;
  const value = useTreeExpander({ nodePaths: flatTree, activePath: workspaceRoute.path, expanderId });
  return <TreeExpanderContext.Provider value={value}>{children}</TreeExpanderContext.Provider>;
}
