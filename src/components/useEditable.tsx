"use client";
import { TreeFile, TreeNode } from "@/clientdb/filetree";
import { useFileTreeMenuContext } from "@/components/SidebarFileMenu";
import { useWorkspaceRoute } from "@/context";
import { AbsPath, RelPath } from "@/lib/paths";
import { useCallback, useEffect, useRef, useState } from "react";
import { isTreeDir } from "../clientdb/filetree";

export function useEditable<T extends TreeFile | TreeNode>({
  treeNode,
  expand,
  onRename,
  onCancelNew,
}: {
  treeNode: T;
  href?: string;
  expand: (node: TreeNode, value: boolean) => void;
  onRename: (newPath: AbsPath) => Promise<AbsPath>;
  onCancelNew: (newPath: AbsPath) => void;
}) {
  const fullPath = treeNode.path;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { path: currentFile } = useWorkspaceRoute();
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing && isVirtual) {
          onCancelNew(fullPath);
        }
        setFileName(fullPath.basename());
        resetEditing();
        linkRef.current?.focus();
      }
      if (e.key === "Enter") {
        if (isEditing) {
          resetEditing();
          onRename(fullPath.dirname().join(fileName)).then((/*newPath*/) => {
            // setFileName(newPath.basename());
          });
        } else {
          setEditing(fullPath);
        }
      } else if (e.key === " ") {
        if (!isEditing) {
          e.preventDefault();
          linkRef.current?.click();
        }
      }
    },
    [isEditing, isVirtual, fullPath, resetEditing, onCancelNew, onRename, fileName, setEditing]
  );

  const handleBlur = useCallback(() => {
    if (isEditing) {
      resetEditing();
      setFileName(fullPath.basename());
    }
  }, [fullPath, isEditing, resetEditing]);

  const handleClick = useCallback(() => {
    linkRef.current?.focus();
    if (isTreeDir(treeNode)) {
      expand(treeNode, true);
    }
  }, []);
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
