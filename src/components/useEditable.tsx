"use client";
import { TreeFile, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { useFileTreeMenuContext, useWorkspaceFileMgmt } from "@/components/SidebarFileMenu";
import { useWorkspaceRoute, WorkspaceRouteType } from "@/context";
import { RelPath } from "@/lib/paths";
import { useCallback, useEffect, useRef, useState } from "react";

export function useEditable<T extends TreeFile | TreeNode>({
  treeNode,
  expand,
  currentWorkspace,
  onClick,
  workspaceRoute,
}: {
  currentWorkspace: Workspace;
  workspaceRoute: WorkspaceRouteType;
  treeNode: T;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  expand: (node: TreeNode, value: boolean) => void;
}) {
  const fullPath = treeNode.path;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { path: currentFile } = useWorkspaceRoute();
  const { cancelNew, renameFile, newFile } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { editing, resetEditing, setEditType, editType, setEditing, setFocused, focused, virtual } =
    useFileTreeMenuContext();
  const [fileName, setFileName] = useState<RelPath>(fullPath.basename());

  const isSelected = fullPath.equals(currentFile);
  const isEditing = fullPath.equals(editing);
  const isFocused = fullPath.equals(focused);
  const isVirtual = fullPath.equals(virtual);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [expand, fullPath, fullPath.str, isEditing, setFocused]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing && isVirtual) {
          cancelNew();
        }

        setFileName(fullPath.basename());
        resetEditing();
        linkRef.current?.focus();
      }
      if (e.key === "Enter") {
        if (isEditing) {
          if (editType === "rename") renameFile(fullPath, fullPath.dirname().join(fileName));
          if (editType === "new") newFile(fullPath.dirname().join(fileName), "");

          resetEditing();
        } else {
          setEditing(fullPath);
          setEditType("rename");
        }
      } else if (e.key === " ") {
        if (!isEditing) {
          e.preventDefault();
          linkRef.current?.click();
        }
      }
    },
    [
      isEditing,
      isVirtual,
      fullPath,
      resetEditing,
      cancelNew,
      editType,
      renameFile,
      fileName,
      newFile,
      setEditing,
      setEditType,
    ]
  );

  const handleBlur = useCallback(() => {
    if (isEditing) {
      resetEditing();
      setFileName(fullPath.basename());
    }
    if (isEditing && isVirtual) {
      cancelNew();
    }
    setFocused(null);
  }, [cancelNew, fullPath, isEditing, isVirtual, resetEditing, setFocused]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      linkRef.current?.focus();
      onClick?.(e);
    },
    [onClick]
  );
  return {
    isEditing,
    setFocused,
    currentFile,
    fileName,
    isSelected,
    isFocused,
    setEditing,
    handleKeyDown,
    handleBlur,
    handleClick,
    setFileName,
    linkRef,
    inputRef,
  };
}
