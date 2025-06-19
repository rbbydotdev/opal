"use client";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";

export const FileTreeMenuContext = React.createContext<{
  editing: AbsPath | null;
  setEditing: React.Dispatch<React.SetStateAction<AbsPath | null>>;
  editType: "rename" | "new" | "duplicate";
  setFocused: (path: AbsPath | null) => void;
  focused: AbsPath | null;
  setEditType: React.Dispatch<React.SetStateAction<"rename" | "new" | "duplicate">>;
  resetEditing: () => void;
  setSelectedRange: (path: AbsPath[]) => void;
  highlightDragover: (menuItem: TreeNode) => boolean;
  resetSelects: () => void;
  setDragOver: (node: TreeNode | null) => void;
  dragOver: TreeNode | null;
  draggingNode: TreeNode | null;
  draggingNodes: TreeNode[];
  setDraggingNode: (node: TreeNode | null) => void;
  setDraggingNodes: (node: TreeNode[]) => void;
  selectedRange: AbsPath[];
  virtual: AbsPath | null;
  setVirtual: (path: AbsPath | null) => void;
} | null>(null);

export function useFileTreeMenuContext() {
  const ctx = React.useContext(FileTreeMenuContext);
  if (!ctx) {
    throw new Error("useFileTreeMenuContext must be used within a FileTreeMenuContextProvider");
  }
  return ctx;
}
export const FileTreeMenuContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { filePath } = Workspace.parseWorkspacePath(pathname);
  const [editing, setEditing] = React.useState<AbsPath | null>(null);
  const [editType, setEditType] = React.useState<"rename" | "new" | "duplicate">("rename");
  const [focused, setFocused] = React.useState<AbsPath | null>(filePath ?? null);
  const [virtual, setVirtual] = React.useState<AbsPath | null>(null);
  const [dragOver, setDragOver] = React.useState<TreeNode | null>(null);
  const [selectedRange, setSelectedRange] = React.useState<AbsPath[]>([]);
  const [draggingNode, setDraggingNode] = React.useState<TreeNode | null>(null);
  const [draggingNodes, setDraggingNodes] = React.useState<TreeNode[]>([]);

  const resetEditing = useCallback(() => {
    setEditing(null);
    setEditType("rename");
    setVirtual(null);
  }, []);

  const resetSelects = useCallback(() => {
    setSelectedRange([]);
    setFocused(null);
  }, []);

  const highlightDragover = useCallback(
    (menuItem: TreeNode) => {
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
    },
    [draggingNode, dragOver]
  );

  React.useEffect(() => {
    const escapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetSelects();
    };
    window.addEventListener("keydown", escapeKey);
    return () => window.removeEventListener("keydown", escapeKey);
  }, [resetSelects]);
  const setFocusedAndRange = (path: AbsPath | null) => {
    //currently a hack to set focused and selectedRange
    //if sh!t breaks undo this
    setFocused(path);
    setSelectedRange(path ? [path] : []);
  };
  return (
    <FileTreeMenuContext.Provider
      value={{
        selectedRange,
        setSelectedRange,
        dragOver,
        setDragOver,
        setDraggingNode,
        setDraggingNodes,
        draggingNodes,
        draggingNode: draggingNode,
        highlightDragover,
        setFocused: setFocusedAndRange,
        editType,
        setEditType,
        focused,
        resetSelects,
        setVirtual,
        virtual,
        editing,
        setEditing,
        resetEditing,
      }}
    >
      {children}
    </FileTreeMenuContext.Provider>
  );
};
