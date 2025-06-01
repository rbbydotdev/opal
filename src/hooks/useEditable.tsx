"use client";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { useWorkspaceRoute, WorkspaceRouteType } from "@/context";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { basename, changePrefixRel, equals, prefix, RelPath, relPath } from "@/lib/paths2";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { cancelNew, commitChange } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { editing, editType, resetEditing, setEditing, setFocused, focused, virtual, setSelectedRange, selectedRange } =
    useFileTreeMenuContext();
  const [fileName, setFileName] = useState<RelPath>(relPath(basename(fullPath)));

  const isSelected = equals(fullPath, currentFile);
  const isEditing = equals(fullPath, editing);
  const isFocused = equals(fullPath, focused);
  const isVirtual = equals(fullPath, virtual);
  const isSelectedRange = useMemo(() => selectedRange.includes(treeNode.path), [selectedRange, treeNode.path]);

  //assuring focus on the input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [expand, fullPath, isEditing, setFocused]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setFocused(treeNode.path);
        setSelectedRange(Array.from(new Set([...selectedRange, treeNode.path])));
        return;
      }
      if (e.shiftKey && focused) {
        const focusedNode = currentWorkspace.disk.fileTree.nodeFromPath(focused);
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

  const cancelEdit = useCallback(() => {
    setFileName(relPath(basename(fullPath)));
    resetEditing();
    linkRef.current?.focus();
  }, [fullPath, resetEditing]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        if (isEditing) {
          if (isVirtual) cancelNew();
          cancelEdit();
        } else {
          setFocused(null);
          if (selectedRange.length) setSelectedRange([]);
          linkRef?.current?.blur();
        }
      } else if (e.key === "Enter") {
        if (isEditing) {
          if (prefix(fileName) && (editType === "new" || prefix(fileName) !== prefix(relPath(basename(fullPath))))) {
            const wantPath = relPath(basename(changePrefixRel(relPath(basename(fullPath)), prefix(fileName))));
            const gotPath = await commitChange(treeNode, wantPath, editType);
            resetEditing();
            setFileName(relPath(basename(gotPath)));
            setFocused(gotPath);
            if (treeNode.type === "file" && (equals(fullPath, workspaceRoute.path) || !workspaceRoute.path)) {
              router.push(currentWorkspace.resolveFileUrl(gotPath));
            }
          } else {
            cancelEdit();
          }
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
      cancelEdit,
      setFocused,
      selectedRange.length,
      setSelectedRange,
      fileName,
      editType,
      fullPath,
      commitChange,
      treeNode,
      resetEditing,
      workspaceRoute.path,
      router,
      currentWorkspace,
      setEditing,
    ]
  );

  const handleFocus = useCallback(() => {
    if (selectedRange.includes(treeNode.str)) {
      //I HAVE NO IDEA WHAT THIS IS FOR!?
      // linkRef.current?.blur();
      return;
    }

    //range select
    setFocused(treeNode.path);
  }, [selectedRange, setFocused, treeNode.path, treeNode.str]);

  const handleBlur = useCallback(() => {
    if (isEditing) {
      resetEditing();
      cancelEdit();
    }
    if (isEditing && isVirtual) {
      cancelNew();
    }
    setFocused(null);
  }, [cancelEdit, cancelNew, isEditing, isVirtual, resetEditing, setFocused]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      (e.target as HTMLElement).focus(); ///WTF?!
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
