import { createContext, ReactNode, useContext } from "react";

export interface WorkspaceFileTreeContextValue {
  // TODO: add fields like: fileTree, refresh(), selectFile(), etc.
  // fileTree?: YourFileTreeType;
  fileTree: {};
}

// const { currentWorkspace, fileTreeDir } = useWorkspaceContext();
// const flatTree = useMemo(
//   () => Array.from(fileTreeDir.iterator(FileOnlyFilter)).map((node) => node.toString()),
//   [fileTreeDir]
// );
// const { cmdMap, commands } = useSpotlightCommandPalette({
//   currentWorkspace,
// });

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
