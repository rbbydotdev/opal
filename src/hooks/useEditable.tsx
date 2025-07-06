"use client";
import { Workspace } from "@/Db/Workspace";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDir, TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { basename, changePrefix, prefix, RelPath, relPath, sanitizeUserInputFilePath } from "@/lib/paths2";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const { commitChange, trashSelectedFiles } = useWorkspaceFileMgmt(currentWorkspace);
  const { editing, editType, setFileTreeCtx, focused, virtual, selectedRange } = useFileTreeMenuCtx();
  const [fileName, setFileName] = useState<RelPath>(relPath(basename(fullPath)));
  const isSelected = fullPath === currentFile;
  const isEditing = fullPath === editing;
  const isFocused = fullPath === focused;
  const isVirtual = fullPath === virtual;
  const isSelectedRange = useMemo(() => selectedRange.includes(treeNode.path), [selectedRange, treeNode.path]);
  const pathname = usePathname();
  const isCurrentPath = useMemo(
    () => Workspace.parseWorkspacePath(pathname).filePath === fullPath,
    [pathname, fullPath]
  );

  //assuring focus on the input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [expand, fullPath, isCurrentPath, isEditing, isFocused]);

  useEffect(() => {
    if (isCurrentPath && !isEditing && linkRef.current) {
      setTimeout(() => {
        if (linkRef.current && document.activeElement !== linkRef.current) {
          // console.log(document.activeElement, "focus on linkRef");
          linkRef.current?.focus();
        }
      }, 0);
    }
  }, [isCurrentPath, isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setFileTreeCtx(({ selectedRange }) => ({
        editing: null,
        editType: null,
        focused: treeNode.path,
        virtual: null,
        selectedRange: Array.from(new Set([...selectedRange, treeNode.path])),
      }));

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
      //check if there was a right click
      setFileTreeCtx(({ selectedRange }) => ({
        editing: null,
        editType: null,
        focused: treeNode.path,
        virtual: null,
        selectedRange: [...new Set(selectedRange).add(treeNode.path)],
      }));
    }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      return;
    }
    if (!e.shiftKey) {
      linkRef.current?.focus();
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: treeNode.path,
        virtual: null,
        selectedRange: [treeNode.path],
      });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // e.stopPropagation();
      if (virtual) {
        currentWorkspace.removeVirtualfile(virtual);
      }
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
          e.stopPropagation();
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
    } else if (!isEditing && focused && (e.key === "Delete" || e.key === "Backspace") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void trashSelectedFiles();
    }
  };

  const handleFocus = () => {
    if (selectedRange.includes(treeNode.path)) {
      //to prevent eager focus on click and drag
      return;
    }
    setFileTreeCtx({
      editing,
      editType,
      virtual,
      focused: treeNode.path,
      selectedRange: [treeNode.path],
    });
  };

  const handleBlur = (_e: React.FocusEvent<HTMLInputElement | HTMLAnchorElement>) => {
    if (virtual) currentWorkspace.removeVirtualfile(virtual);

    setFileTreeCtx(({ focused, selectedRange }) => ({
      editing: null,
      editType: null,
      virtual: null,
      focused,
      selectedRange,
    }));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.button === 2) {
      return;
    }
    // (e.target as HTMLElement).closest("a")?.focus();
    //meta key cmd click or ctrl click
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };
  return {
    isEditing,
    currentFile,
    fileName,
    isSelected,
    isCurrentPath,
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
