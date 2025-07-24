"use client";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useTreeExpander } from "@/features/tree-expander/useTreeExpander";
import { createContext, ReactNode } from "react";

type TreeExpanderContextType = ReturnType<typeof useTreeExpander>;
export const TreeExpanderContext = createContext<TreeExpanderContextType | undefined>(undefined);

export function TreeExpanderProvider({ children, id }: { children: ReactNode; id: string }) {
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;
  const value = useTreeExpander({ flatTree, activePath: workspaceRoute.path, expanderId });
  // console.log(expanderId, JSON.stringify(value.expanded, null, 4));
  return <TreeExpanderContext.Provider value={value}>{children}</TreeExpanderContext.Provider>;
}
