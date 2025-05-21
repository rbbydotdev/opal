"use client";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { useWorkspaceRoute, WorkspaceRouteType } from "@/context";
import { TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { RelPath } from "@/lib/paths";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceFileMgmt } from "./useWorkspaceFileMgmt";

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
  const router = useRouter();
  const { cancelNew, commitChange: commitChange } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { editing, editType, resetEditing, setEditing, setFocused, focused, virtual, setSelectedRange, selectedRange } =
    useFileTreeMenuContext();
  const [fileName, setFileName] = useState<RelPath>(fullPath.basename());

  const isSelected = fullPath.equals(currentFile);
  const isEditing = fullPath.equals(editing);
  const isFocused = fullPath.equals(focused);
  const isVirtual = fullPath.equals(virtual);
  const isSelectedRange = useMemo(() => selectedRange.includes(treeNode.path.str), [selectedRange, treeNode.path.str]);

  //assuring focus on the input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [expand, fullPath, fullPath.str, isEditing, setFocused]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setFocused(treeNode.path);
        setSelectedRange(Array.from(new Set([...selectedRange, treeNode.path.str])));
        return;
      }
      if (e.shiftKey && focused) {
        const focusedNode = currentWorkspace.disk.fileTree.nodeFromPath(focused);
        // console.log({ focusedNode, treeNode });
        if (focusedNode) {
          const range = currentWorkspace.disk.fileTree.findRange(treeNode, focusedNode) ?? [];

          setSelectedRange(range);
        }

        e.preventDefault(); ///////////
        e.stopPropagation(); ///// the goal here is to prevent a focus on a select range
      }
    },
    [currentWorkspace.disk.fileTree, focused, selectedRange, setFocused, setSelectedRange, treeNode]
  );
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey) {
        setSelectedRange([]);
        linkRef.current?.focus();
      }
    },
    [setSelectedRange]
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
          const wantPath = fullPath.changePrefix(String(fileName.prefix())).basename();
          const gotPath = await commitChange(treeNode, wantPath, editType);
          setFileName(gotPath.basename());
          if (treeNode.type === "file" && (fullPath.equals(workspaceRoute.path) || !workspaceRoute.path)) {
            router.push(currentWorkspace.resolveFileUrl(gotPath));
          }
          resetEditing();
          setFocused(gotPath);
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
    [
      isEditing,
      isVirtual,
      cancelNew,
      fullPath,
      resetEditing,
      setFocused,
      selectedRange.length,
      setSelectedRange,
      fileName,
      commitChange,
      treeNode,
      editType,
      workspaceRoute.path,
      router,
      currentWorkspace,
      setEditing,
    ]
  );

  const handleFocus = useCallback(() => {
    if (selectedRange.includes(treeNode.str) && linkRef.current) {
      linkRef.current.blur();
      return;
    }

    //range select
    setFocused(treeNode.path);
  }, [selectedRange, setFocused, treeNode.path, treeNode.str]);

  const handleBlur = useCallback(() => {
    if (isEditing) {
      resetEditing();
    }
    if (isEditing && isVirtual) {
      cancelNew();
    }
    setFocused(null);
  }, [cancelNew, isEditing, isVirtual, resetEditing, setFocused]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      //meta key cmd click or ctrl click
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
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

    handleMouseUp,
    handleFocus,
    handleClick,
    handleMouseDown,
    setFileName,
    linkRef,
    inputRef,
  };
}
