import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useTreeExpander } from "@/features/tree-expander/useTreeExpander";
import { createContext, ReactNode } from "react";

type TreeExpanderContextType = ReturnType<typeof useTreeExpander>;
export const TreeExpanderContext = createContext<TreeExpanderContextType | undefined>(undefined);

export function TreeExpanderProvider({
  children,
  id,
  nodePaths = [],
}: {
  children: ReactNode;
  id: string;
  nodePaths?: string[];
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;
  const value = useTreeExpander({ nodePaths, activePath: workspaceRoute.path, expanderId });
  return <TreeExpanderContext.Provider value={value}>{children}</TreeExpanderContext.Provider>;
}
