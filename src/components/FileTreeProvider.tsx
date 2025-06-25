"use client";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, dirname } from "@/lib/paths2";
import { usePathname } from "next/navigation";
import React, { useCallback, useMemo } from "react";

export const FileTreeMenuCtx = React.createContext<{
  editing: AbsPath | null;
  editType: "rename" | "new" | "duplicate" | null;
  focused: AbsPath | null;
  resetEditing: () => void;
  highlightDragover: (menuItem: TreeNode) => boolean;
  setDragOver: (node: TreeNode | null) => void;
  dragOver: TreeNode | null;
  selectedFocused: AbsPath[];
  draggingNode: TreeNode | null;
  draggingNodes: TreeNode[];
  id: FILE_TREE_MENUS_TYPE;
  setFileTreeCtx: ({
    editing,
    editType,
    focused,
    virtual,
    selectedRange,
  }: {
    editing: AbsPath | null;
    editType: "rename" | "new" | "duplicate" | null;
    focused: AbsPath | null;
    virtual: AbsPath | null;
    selectedRange: AbsPath[];
  }) => void;
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
  const [editing, setEditing] = React.useState<AbsPath | null>(null);
  const [editType, setEditType] = React.useState<"rename" | "new" | "duplicate" | null>("rename");
  const [focused, setFocused] = React.useState<AbsPath | null>(filePath ?? null);
  const [virtual, setVirtual] = React.useState<AbsPath | null>(null);
  const [dragOver, setDragOver] = React.useState<TreeNode | null>(null);
  const [selectedRange, setSelectedRange] = React.useState<AbsPath[]>([]);
  const [draggingNode, setDraggingNode] = React.useState<TreeNode | null>(null);
  const [draggingNodes, setDraggingNodes] = React.useState<TreeNode[]>([]);

  const setFileTreeCtx = useCallback(
    ({
      editing,
      editType,
      focused,
      virtual,
      selectedRange,
    }: {
      editing: AbsPath | null;
      editType: EditType | null;
      focused: AbsPath | null;
      virtual: AbsPath | null;
      selectedRange: AbsPath[];
    }) => {
      setEditing(editing);
      setEditType(editType);
      setFocused(focused);
      setVirtual(virtual);
      setSelectedRange(selectedRange);
    },
    []
  );

  const resetEditing = useCallback(() => {
    setFileTreeCtx({
      editing: null,
      editType: "rename",
      focused: dirname(focused ?? "/"),
      virtual: null,
      selectedRange: [],
    });
  }, [focused, setFileTreeCtx]);

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
      if (e.key === "Escape") {
        setFileTreeCtx({
          editing: null,
          editType: null,
          focused: null,
          virtual: null,
          selectedRange: [],
        });
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
        setFileTreeCtx: (props) => {
          //DEBUG
          return setFileTreeCtx(props);
        },
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

// const fileTreeCtxNode = useCallback(
//   (treeNode: TreeNode) => {
//     return new Proxy(treeNode, {
//       get(target, prop, receiver) {
//         if (prop === "virtual") return virtual === target.path;
//         if (prop === "editing") return editing === target.path;
//         if (prop === "focused") return focused === target.path;
//         if (prop === "editType") return editing === target.path ? editType : null;
//         if (prop === "setVirtual") return (path: AbsPath | null) => setVirtual(path);
//         if (prop === "setEditing") return (path: AbsPath | null) => setEditing(path);
//         if (prop === "setFocused") return (path: AbsPath | null) => setFocused(path);
//         if (prop === "setEditType") return (type: "rename" | "new" | "duplicate") => setEditType(type);
//         return Reflect.get(target, prop, receiver);
//       },
//     }) as FileTreeCtxNode;
//   },
//   [virtual, editing, focused, editType, setVirtual, setEditing, setFocused, setEditType]
// );

// interface FileTreeCtxNode extends TreeNode {
//   virtual: boolean;
//   editing: boolean;
//   focused: boolean;
//   editType: EditType | null;
//   setVirtual: (path: string | null) => void;
//   setEditing: (path: string | null) => void;
//   setFocused: (path: string | null) => void;
//   setEditType: (type: EditType) => void;
// }
