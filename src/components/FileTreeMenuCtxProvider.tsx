"use client";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, dirname } from "@/lib/paths2";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";

export const FileTreeMenuCtx = React.createContext<{
  editing: AbsPath | null;
  editType: "rename" | "new" | "duplicate" | null;
  focused: AbsPath | null;
  resetEditing: () => void;
  highlightDragover: (menuItem: TreeNode) => boolean;
  setDragOver: (node: TreeNode | null) => void;
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
  id: FILE_TREE_MENUS_TYPE;
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

export const FILE_TREE_MENUS = ["TrashFiles", "MainFiles"] as const;
export type FILE_TREE_MENUS_TYPE = (typeof FILE_TREE_MENUS)[number];
export const FileTreeMenuCtxProvider = ({
  children,
  id,
}: {
  id: (typeof FILE_TREE_MENUS)[number];
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const { filePath } = Workspace.parseWorkspacePath(pathname);
  const [dragOver, setDragOver] = useState<TreeNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<TreeNode | null>(null);
  const [draggingNodes, setDraggingNodes] = useState<TreeNode[]>([]);

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

  const { editing, focused, virtual, selectedRange, editType } = fileTreeCtx;

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
        id,
        selectedRange,
        setFileTreeCtx,
        dragOver,
        setDragOver,
        setDraggingNode,
        setDraggingNodes,
        selectedFocused,
        draggingNodes,
        draggingNode: draggingNode,
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
