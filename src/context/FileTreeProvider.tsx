import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
import { useWatchWorkspaceFileTree } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { FileTree, NULL_FILE_TREE } from "@/lib/FileTree/Filetree";
import { NULL_TREE_ROOT, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { createContext, useContext } from "react";

export const NoopContextMenu: FileItemContextMenuComponentType = ({ children }) => <>{children}</>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultFileTreeContext = {
  fileTreeDir: NULL_TREE_ROOT as TreeDirRoot,
  flatTree: [] as AbsPath[],
  fileTree: NULL_FILE_TREE as FileTree,
  ItemContextMenu: NoopContextMenu as FileItemContextMenuComponentType,
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
  filterIn,
  filterOut,
  children,
  ItemContextMenu,
}: {
  filterIn?: (node: TreeNode) => boolean;
  filterOut?: (node: TreeNode) => boolean;
  currentWorkspace: Workspace;
  children: React.ReactNode;
  ItemContextMenu: FileItemContextMenuComponentType;
}) {
  const { fileTreeDir, flatTree, fileTree } = useWatchWorkspaceFileTree({ currentWorkspace, filterIn, filterOut });

  return (
    <FileTreeContext.Provider
      value={{
        fileTreeDir,
        flatTree,
        fileTree,
        ItemContextMenu,
      }}
    >
      {children}
    </FileTreeContext.Provider>
  );
}
