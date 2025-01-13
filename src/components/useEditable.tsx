"use client";
import { TreeFile, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { useFileTreeMenuContext, useWorkspaceFileMgmt } from "@/components/SidebarFileMenu";
import { useWorkspaceRoute, WorkspaceRouteType } from "@/context";
import { RelPath } from "@/lib/paths";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const { editing, resetEditing, setEditing, setFocused, focused, virtual, setSelectedRange, selectedRange } =
    useFileTreeMenuContext();
  const [fileName, setFileName] = useState<RelPath>(fullPath.basename());

  const isSelected = fullPath.equals(currentFile);
  const isEditing = fullPath.equals(editing);
  const isFocused = fullPath.equals(focused);
  const isVirtual = fullPath.equals(virtual);
  const isSelectedRange = useMemo(() => selectedRange.includes(treeNode.path.str), [selectedRange, treeNode.path.str]);

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey && focused) {
        const focusedNode = currentWorkspace.disk.fileTree.nodeFromPath(focused);
        if (focusedNode) {
          const range = currentWorkspace.disk.fileTree.findRange(treeNode, focusedNode);
          setSelectedRange(range ?? []);
        }
      } else {
        setSelectedRange([]);
      }
    },
    [currentWorkspace.disk.fileTree, focused, setSelectedRange, treeNode]
  );

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
          if (selectedRange.length) setSelectedRange([]);
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

  const handleFocus = useCallback(
    (e: React.MouseEvent) => {
      //range select
      setFocused(treeNode.path);
    },
    [setFocused, treeNode]
  );

  const handleBlur = useCallback(() => {
    if (selectedRange.length) {
      setSelectedRange([]);
    }
    if (isEditing) {
      resetEditing();
      setFileName(fullPath.basename());
    }
    if (isEditing && isVirtual) {
      cancelNew();
    }
    setFocused(null);
  }, [cancelNew, fullPath, isEditing, isVirtual, resetEditing, selectedRange.length, setFocused, setSelectedRange]);

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
    isSelectedRange,
    isFocused,
    setEditing,
    handleKeyDown,
    handleBlur,

    handleFocus,
    handleClick,
    handleMouseDown,
    setFileName,
    linkRef,
    inputRef,
  };
}
