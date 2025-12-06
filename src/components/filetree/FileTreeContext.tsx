import { FileItemContextMenuComponentType } from "@/components/filetree/FileItemContextMenuComponentType";
import { FileTree, NULL_FILE_TREE } from "@/components/filetree/Filetree";
import { NULL_TREE_ROOT, TreeDirRoot, TreeNode } from "@/components/filetree/TreeNode";
import { Disk } from "@/data/disk/Disk";
import { AbsPath } from "@/lib/paths2";
import { useWatchWorkspaceFileTree, useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { createContext, useContext } from "react";

export const NoopContextMenu: FileItemContextMenuComponentType = ({ children }) => <>{children}</>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultFileTreeContext = {
  fileTreeDir: NULL_TREE_ROOT as TreeDirRoot,
  flatTree: [] as AbsPath[],
  fileTree: NULL_FILE_TREE as FileTree,
};
const FileTreeContext = createContext<typeof defaultFileTreeContext | null>(null);

export const useFileTreeContext = () => {
  const ctx = useContext(FileTreeContext);
  if (!ctx) throw new Error("useFileTree must be used within a FileTreeProvider");
  return ctx;
};

export function FileTreeProvider({
  filterIn,
  filterOut,
  children,
  disk,
}: {
  filterIn?: (node: TreeNode) => boolean;
  filterOut?: (node: TreeNode) => boolean;
  children: React.ReactNode | ((context: { fileTree: FileTree }) => React.ReactNode);
  disk?: Disk;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTreeDir, flatTree, fileTree } = useWatchWorkspaceFileTree({
    disk: disk || currentWorkspace.getDisk(),
    filterIn,
    filterOut,
  });

  return (
    <FileTreeContext.Provider
      value={{
        fileTreeDir,
        flatTree,
        fileTree,
      }}
    >
      {typeof children === "function" ? children({ fileTree }) : children}
    </FileTreeContext.Provider>
  );
}
