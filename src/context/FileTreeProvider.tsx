import { useWatchWorkspaceFileTree } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { FileTree, NULL_FILE_TREE } from "@/lib/FileTree/Filetree";
import { NULL_TREE_ROOT, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { createContext, useContext } from "react";
const defaultFileTreeContext = {
  fileTreeDir: NULL_TREE_ROOT as TreeDirRoot,
  flatTree: [] as AbsPath[],
  fileTree: NULL_FILE_TREE as FileTree,
};
// defaultFileTreeContext
const FileTreeContext = createContext<typeof defaultFileTreeContext | null>(null);

export const useFileTree = () => {
  const ctx = useContext(FileTreeContext);
  if (!ctx) throw new Error("useFileTree must be used within a FileTreeProvider");
  return ctx;
};

export function FileTreeProvider({
  currentWorkspace,
  filterIn = () => true,
  filterOut = () => false,
  children,
}: {
  filterIn?: (node: TreeNode) => boolean;
  filterOut?: (node: TreeNode) => boolean;
  currentWorkspace: Workspace;
  children: React.ReactNode;
}) {
  const { fileTreeDir, flatTree, fileTree } = useWatchWorkspaceFileTree({ currentWorkspace, filterIn, filterOut });

  return (
    <FileTreeContext.Provider
      value={{
        fileTreeDir,
        flatTree,
        fileTree,
      }}
    >
      {children}
    </FileTreeContext.Provider>
  );
}
