"use client";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDir, TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { basename, changePrefix, prefix, RelPath, relPath, sanitizeUserInputFilePath } from "@/lib/paths2";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
export function useEditable<T extends TreeFile | TreeDir>({
  treeNode,
  expand,
  currentWorkspace,
  onClick,
}: {
  currentWorkspace: Workspace;
  treeNode: T;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  expand: (node: TreeNode, value: boolean) => void;
}) {
  const fullPath = treeNode.path;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { path: currentFile } = useWorkspaceRoute();
  const { commitChange } = useWorkspaceFileMgmt(currentWorkspace);
  const { editing, editType, setFileTreeCtx, focused, virtual, selectedRange } = useFileTreeMenuCtx();
  const [fileName, setFileName] = useState<RelPath>(relPath(basename(fullPath)));
  const isSelected = fullPath === currentFile;
  const isEditing = fullPath === editing;
  const isFocused = fullPath === focused;
  const isVirtual = fullPath === virtual;
  const isSelectedRange = useMemo(() => selectedRange.includes(treeNode.path), [selectedRange, treeNode.path]);

  //assuring focus on the input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [expand, fullPath, isEditing, isFocused]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setFileTreeCtx({
          editing: null,
          editType: null,
          focused: treeNode.path,
          virtual: null,
          selectedRange: Array.from(new Set([...selectedRange, treeNode.path])),
        });

        return;
      } else if (e.shiftKey && focused) {
        e.preventDefault();
        e.stopPropagation();
        const focusedNode = currentWorkspace.disk.fileTree.nodeFromPath(focused);
        if (focusedNode) {
          const range = currentWorkspace.disk.fileTree.findRange(treeNode, focusedNode) ?? [];
          setFileTreeCtx({
            editing: null,
            editType: null,
            focused: treeNode.path,
            virtual: null,
            selectedRange: range,
          });
        }
      } else if (!isEditing) {
        setFileTreeCtx({
          editing: null,
          editType: null,
          focused: treeNode.path,
          virtual: null,
          selectedRange: [...new Set(selectedRange).add(treeNode.path)],
        });
      }
    },
    [currentWorkspace.disk.fileTree, focused, isEditing, selectedRange, setFileTreeCtx, treeNode]
  );
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey) {
        linkRef.current?.focus();
        // const newRange = [...new Set(selectedRange).add(treeNode.path)];
        setFileTreeCtx({
          editing: null,
          editType: null,
          focused: treeNode.path,
          virtual: null,
          selectedRange: [treeNode.path],
        });
      }
    },
    [setFileTreeCtx, treeNode.path]
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        if (virtual) currentWorkspace.removeVirtualfile(virtual);
        setFileTreeCtx({
          editing: null,
          editType: null,
          virtual: null,
          focused,
          selectedRange: [],
        });
        linkRef?.current?.blur();
      } else if (e.key === "Enter") {
        if (isEditing && editType) {
          if (
            prefix(fileName) &&
            (["new", "duplicate"].includes(editType) || prefix(fileName) !== prefix(basename(fullPath)))
          ) {
            const wantPath = basename(changePrefix(fullPath, sanitizeUserInputFilePath(prefix(fileName))));
            const gotPath = await commitChange(treeNode, wantPath, editType);
            const newFocused = gotPath ?? fullPath;
            if (gotPath !== null) {
              setFileName(basename(gotPath));
            }
            return setFileTreeCtx({
              editing: null,
              editType: null,
              virtual: null,
              focused: newFocused,
              selectedRange: [newFocused],
            });
          } else {
            return setFileTreeCtx({
              editing: null,
              editType: null,
              virtual: null,
              focused,
              selectedRange: focused ? [focused] : [],
            });
          }
        } /*is not editing  time to edit! */ else {
          return setFileTreeCtx({
            editing: treeNode.path,
            editType: "rename",
            virtual: null,
            focused: treeNode.path,
            selectedRange: [treeNode.path],
          });
        }
      } else if (e.key === " " && !isEditing) {
        e.preventDefault();
        linkRef.current?.click();
      }
    },
    [
      isEditing,
      virtual,
      currentWorkspace,
      setFileTreeCtx,
      focused,
      editType,
      fileName,
      fullPath,
      commitChange,
      treeNode,
    ]
  );

  const handleFocus = useCallback(() => {
    if (selectedRange.includes(treeNode.path)) {
      //to prevent eager focus on click and drag
      return;
    }
    setFileTreeCtx({
      editing,
      editType,
      virtual: null,
      focused: treeNode.path,
      selectedRange: [treeNode.path],
    });
  }, [editType, editing, selectedRange, setFileTreeCtx, treeNode.path]);

  const handleBlur = useCallback(
    (_e: React.FocusEvent<HTMLInputElement | HTMLAnchorElement>) => {
      if (virtual) currentWorkspace.removeVirtualfile(virtual);

      setFileTreeCtx({
        editing: null,
        editType: null,
        virtual: null,
        focused,
        selectedRange,
      });
    },
    [currentWorkspace, focused, selectedRange, setFileTreeCtx, virtual]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      (e.target as HTMLElement).focus();
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
    currentFile,
    fileName,
    isSelected,
    isSelectedRange,
    isFocused,
    isVirtual,
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
