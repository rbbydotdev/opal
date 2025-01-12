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
  const { cancelNew, commitChange } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { editing, resetEditing, setEditing, setFocused, focused, virtual } = useFileTreeMenuContext();
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

  // useEffect(() => {
  //   if (isFocused && isSelected && linkRef.current) {
  //     linkRef.current.focus();
  //   }
  // }, [isFocused, isSelected]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        if (isEditing) {
          if (isVirtual) cancelNew();
          setFileName(fullPath.basename());
          resetEditing();
          linkRef.current?.focus();
        } else {
          setFocused(null);
          linkRef?.current?.blur();
        }
      } else if (e.key === "Enter") {
        if (isEditing) {
          const newPath = await commitChange(treeNode, fileName);
          setFocused(newPath);
          e.preventDefault();
        } else {
          setEditing(fullPath);
          setFocused(fullPath);
        }
      } else if (e.key === " " && !isEditing) {
        e.preventDefault();
        linkRef.current?.click();
      }
    },
    [isEditing, isVirtual, fullPath, resetEditing, cancelNew, commitChange, treeNode, fileName, setEditing, setFocused]
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
      if (e.shiftKey) {
        e.preventDefault();
        return;
      }

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
