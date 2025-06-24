"use client";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useFileTreeExpander } from "@/features/filetree-expander/useFileTreeExpander";
import { createContext, ReactNode } from "react";

type FileTreeExpanderContextType = ReturnType<typeof useFileTreeExpander>;
export const FileTreeExpanderContext = createContext<FileTreeExpanderContextType | undefined>(undefined);

export function FileTreeExpanderProvider({ children, id }: { children: ReactNode; id?: string }) {
  const { id: ctxId } = useFileTreeMenuCtx();
  id = id ?? ctxId;
  if (!id) {
    throw new Error("FileTreeExpanderProvider requires a valid 'id' prop or via useFileTreeMenuCtx");
  }
  const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
  const expanderId = currentWorkspace.id + "/" + id;
  const value = useFileTreeExpander({ flatTree, activePath: workspaceRoute.path, expanderId });
  return <FileTreeExpanderContext.Provider value={value}>{children}</FileTreeExpanderContext.Provider>;
}
