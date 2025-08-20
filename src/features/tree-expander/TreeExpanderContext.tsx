import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useTreeExpander } from "@/features/tree-expander/useTreeExpander";
import { createContext, ReactNode } from "react";

type TreeExpanderContextType = ReturnType<typeof useTreeExpander>;
export const TreeExpanderContext = createContext<TreeExpanderContextType | undefined>(undefined);

export function TreeExpanderProvider({ children, id }: { children: ReactNode; id: string }) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;
  const value = useTreeExpander({ nodePaths: flatTree, activePath: workspaceRoute.path, expanderId });
  return <TreeExpanderContext.Provider value={value}>{children}</TreeExpanderContext.Provider>;
}
