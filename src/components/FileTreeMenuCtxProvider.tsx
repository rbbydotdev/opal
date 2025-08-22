import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, dirname } from "@/lib/paths2";
import { useLocation } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";

export const FileTreeMenuCtx = React.createContext<{
  editing: AbsPath | null;
  editType: "rename" | "new" | "duplicate" | null;
  focused: AbsPath | null;
  resetEditing: () => void;
  highlightDragover: (menuItem: TreeNode) => boolean;
  setDragOver: (node: TreeNode | null) => void;
  scopedTreeNode: TreeNode;
  dragOver: TreeNode | null;
  setFileTreeCtx: React.Dispatch<
    React.SetStateAction<{
      editing: AbsPath | null;
      editType: "rename" | "new" | "duplicate" | null;
      focused: AbsPath | null;
      virtual: AbsPath | null;
      selectedRange: AbsPath[];
    }>
  >;
  selectedFocused: AbsPath[];
  draggingNode: TreeNode | null;
  draggingNodes: TreeNode[];
  setDraggingNode: (node: TreeNode | null) => void;
  setDraggingNodes: (node: TreeNode[]) => void;
  selectedRange: AbsPath[];
  virtual: AbsPath | null;
} | null>(null);

export function useFileTreeMenuCtx() {
  const ctx = React.useContext(FileTreeMenuCtx);
  if (!ctx) {
    throw new Error("useFileTreeMenuContext must be used within a FileTreeMenuContextProvider");
  }
  return ctx;
}
type EditType = "rename" | "new" | "duplicate";

export const FileTreeMenuCtxProvider = ({
  children,
  currentWorkspace,
  scope,
  // filterRange is needed since selecting ranges will include hidden files in the range
  // so they need filtered out
  filterRange,
}: {
  children: React.ReactNode;
  currentWorkspace: Workspace;
  scope?: AbsPath;
  filterRange?: (path: AbsPath) => boolean;
}) => {
  const location = useLocation();

  const { filePath } = Workspace.parseWorkspacePath(location.pathname);
  const [dragOver, setDragOver] = useState<TreeNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<TreeNode | null>(null);
  const [draggingNodes, setDraggingNodes] = useState<TreeNode[]>([]);
  // useWatchWorkspaceFileTree({ currentWorkspace });

  const scopedTreeNode = useMemo(
    () =>
      typeof scope === "undefined"
        ? currentWorkspace.nodeFromPath(absPath("/"))!
        : currentWorkspace.nodeFromPath(scope)!,
    [currentWorkspace, scope]
  );

  const [fileTreeCtx, setFileTreeCtx] = useState<{
    editing: AbsPath | null;
    editType: EditType | null;
    focused: AbsPath | null;
    virtual: AbsPath | null;
    selectedRange: AbsPath[];
  }>({
    editing: null,
    editType: null,
    focused: filePath ?? null,
    virtual: null,
    selectedRange: [],
  });

  //sync fileTreeCtx with the current workspace,
  const { editing, focused, virtual, selectedRange, editType } = useMemo(() => {
    return {
      editing: currentWorkspace.nodeFromPath(fileTreeCtx.editing)?.path ?? null,
      focused: currentWorkspace.nodeFromPath(fileTreeCtx.focused)?.path ?? null,
      virtual: fileTreeCtx.virtual,
      selectedRange: fileTreeCtx.selectedRange
        .filter((path) => currentWorkspace.nodeFromPath(path) !== null)
        .filter(filterRange ?? (() => true)),
      editType: fileTreeCtx.editType,
    };
  }, [
    currentWorkspace,
    fileTreeCtx.editType,
    fileTreeCtx.editing,
    fileTreeCtx.focused,
    fileTreeCtx.selectedRange,
    fileTreeCtx.virtual,
    filterRange,
  ]);

  const resetEditing = () => {
    setFileTreeCtx(() => ({
      editing: null,
      editType: "rename",
      focused: dirname(focused ?? "/"),
      virtual: null,
      selectedRange: [],
    }));
  };

  const highlightDragover = (menuItem: TreeNode) => {
    if (!dragOver || !draggingNode) return false;
    if (dragOver.isTreeDir()) {
      if (draggingNode.dirname === dragOver.path) return false;
    }
    if (dragOver.isTreeFile()) {
      if (draggingNode.dirname === menuItem.path) return false;

      if (dragOver.dirname === menuItem.path) return true;
    }
    if (dragOver.path === menuItem.path) return true;
    return false;
  };

  React.useEffect(() => {
    const escapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFileTreeCtx(() => ({
          editing: null,
          editType: null,
          focused: null,
          virtual: null,
          selectedRange: [],
        }));
      }
    };
    window.addEventListener("keydown", escapeKey);
    return () => window.removeEventListener("keydown", escapeKey);
  }, [focused, setFileTreeCtx]);
  const selectedFocused = useMemo(
    () => Array.from(new Set([focused, ...selectedRange].filter(Boolean) as AbsPath[])),
    [focused, selectedRange]
  );

  return (
    <FileTreeMenuCtx.Provider
      value={{
        selectedRange,
        setFileTreeCtx,
        scopedTreeNode,
        dragOver,
        setDragOver,
        setDraggingNode,
        setDraggingNodes,
        selectedFocused,
        draggingNodes,
        draggingNode,
        highlightDragover,
        editType,
        focused,
        virtual,
        editing,
        resetEditing,
      }}
    >
      {children}
    </FileTreeMenuCtx.Provider>
  );
};
