import { createContext, ReactNode, useContext } from "react";

export interface WorkspaceFileTreeContextValue {
  fileTree: {};
}
const WorkspaceFileTreeContext = createContext<WorkspaceFileTreeContextValue | undefined>(undefined);

export function useWorkspaceFileTree(): WorkspaceFileTreeContextValue {
  const ctx = useContext(WorkspaceFileTreeContext);
  if (!ctx) {
    throw new Error("useWorkspaceFileTree must be used within a WorkspaceFileTreeProvider");
  }
  return ctx;
}

interface WorkspaceFileTreeProviderProps {
  children: ReactNode;
  value: WorkspaceFileTreeContextValue;
}

export function WorkspaceFileTreeProvider({ children, value }: WorkspaceFileTreeProviderProps) {
  return <WorkspaceFileTreeContext.Provider value={value}>{children}</WorkspaceFileTreeContext.Provider>;
}
