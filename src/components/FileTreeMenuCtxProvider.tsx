import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, dirname } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useLocation } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";

const FileTreeMenuCtx = React.createContext<{
  anchorIndex: number;
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
      anchorIndex: number;
    }>
  >;
  selectedFocused: AbsPath[];
  setIsDragging: (value: boolean) => void;
  isDragging: boolean;
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
  scope,
  // filterRange is needed since selecting ranges will include hidden files in the range
  // so they need filtered out
  // filterRange, TODO - i don't think we need this anymore
}: {
  children: React.ReactNode;
  scope?: AbsPath;
}) => {
  const location = useLocation();
  const { currentWorkspace } = useWorkspaceContext();
  const nodeFromPath = currentWorkspace.nodeFromPath;

  const { filePath } = Workspace.parseWorkspacePath(location.pathname);
  const [dragOver, setDragOver] = useState<TreeNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<TreeNode | null>(null);
  const [draggingNodes, setDraggingNodes] = useState<TreeNode[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const scopedTreeNode = useMemo(
    () => (typeof scope === "undefined" ? nodeFromPath(absPath("/"))! : nodeFromPath(scope)!),
    [nodeFromPath, scope]
  );

  const [fileTreeCtx, setFileTreeCtx] = useState<{
    editing: AbsPath | null;
    editType: EditType | null;
    focused: AbsPath | null;
    virtual: AbsPath | null;
    selectedRange: AbsPath[];
    anchorIndex: number;
  }>({
    editing: null,
    editType: null,
    focused: filePath ?? null,
    virtual: null,
    selectedRange: [],
    anchorIndex: -1,
  });

  //sync fileTreeCtx with the current workspace,
  const { editing, anchorIndex, focused, virtual, selectedRange, editType } = useMemo(() => {
    return {
      anchorIndex: fileTreeCtx.anchorIndex,
      editing: nodeFromPath(fileTreeCtx.editing)?.path ?? null,
      focused: nodeFromPath(fileTreeCtx.focused)?.path ?? null,
      virtual: fileTreeCtx.virtual,
      selectedRange: fileTreeCtx.selectedRange.filter((path) => nodeFromPath(path) !== null),
      editType: fileTreeCtx.editType,
    };
  }, [
    fileTreeCtx.anchorIndex,
    fileTreeCtx.editing,
    fileTreeCtx.focused,
    fileTreeCtx.virtual,
    fileTreeCtx.selectedRange,
    fileTreeCtx.editType,
    nodeFromPath,
  ]);

  const resetEditing = () => {
    setFileTreeCtx(() => ({
      editing: null,
      editType: "rename",
      focused: dirname(focused ?? "/"),
      virtual: null,
      selectedRange: [],
      anchorIndex: -1,
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
          anchorIndex: -1,
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
        anchorIndex,
        selectedRange,
        setFileTreeCtx,
        scopedTreeNode,
        dragOver,
        setDragOver,
        setDraggingNode,
        setIsDragging,
        isDragging,
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
