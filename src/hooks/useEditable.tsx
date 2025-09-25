import { Workspace } from "@/Db/Workspace";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { useRepoInfoContext } from "@/lib/FileTree/FileTreeRepoProvider";
import { TreeDir, TreeFile, TreeNode } from "@/lib/FileTree/TreeNode";
import { basename, newFileName, prefix, RelPath, relPath } from "@/lib/paths2";
import { useLocation } from "@tanstack/react-router";
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
  const currentFile = useWorkspaceRoute().path;

  // const info = useWatchWorkspaceGitRepoInfo();
  // const conflicted = info.conflictedFiles.has(fullPath);
  const { flatTree } = useFileTree();
  const { commitChange, trashSelectedFiles } = useWorkspaceFileMgmt(currentWorkspace);
  const { editing, editType, anchorIndex, setFileTreeCtx, focused, virtual, selectedRange } = useFileTreeMenuCtx();

  const treeExpander = useTreeExpanderContext();

  // Create a visible-only version of the flat tree that respects expanded state
  const visibleFlatTree = useMemo(() => {
    if (!treeExpander) {
      // If no tree expander context, return all items
      return flatTree;
    }

    return flatTree.filter((path) => {
      // Skip root directory - it's not a navigable item
      if (path === "/") return false;

      const node = currentWorkspace.nodeFromPath(path);
      if (!node) return false;

      // Check if all parent directories are expanded
      let parentNode = node.parent;
      while (parentNode && parentNode.path !== "/") {
        if (!treeExpander.isExpanded(parentNode.path)) {
          return false;
        }
        parentNode = parentNode.parent;
      }

      return true;
    });
  }, [flatTree, treeExpander, currentWorkspace]);
  const [fileName, setFileName] = useState<RelPath>(relPath(basename(fullPath)));
  const info = useRepoInfoContext();
  const isConflicted = useMemo(() => info.conflictingFiles.includes(fullPath), [fullPath, info.conflictingFiles]);
  const isSelected = fullPath === currentFile;
  const isEditing = fullPath === editing;
  const isFocused = fullPath === focused;
  const isVirtual = fullPath === virtual;
  const isSelectedRange = useMemo(() => selectedRange.includes(treeNode.path), [selectedRange, treeNode.path]);
  const location = useLocation();
  const isCurrentPath = useMemo(
    () => Workspace.parseWorkspacePath(location.pathname).filePath === fullPath,
    [location.pathname, fullPath]
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
          linkRef.current?.focus();
        }
      }, 0);
    }
  }, [isCurrentPath, isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      //ignore and allow for context menu
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      //add single file to selection
      //if already selected, remove it
      setFileTreeCtx(({ selectedRange }) => ({
        anchorIndex: anchorIndex < 0 ? flatTree.indexOf(treeNode.path) : anchorIndex,
        editing: null,
        editType: null,
        focused: !selectedRange.includes(treeNode.path) ? treeNode.path : null,
        virtual: null,
        selectedRange: selectedRange.includes(treeNode.path)
          ? selectedRange.filter((p) => p !== treeNode.path)
          : Array.from(new Set([...selectedRange, treeNode.path])),
      }));

      return;
    } else if (e.shiftKey && focused) {
      //select range of files
      e.preventDefault();
      e.stopPropagation();
      // const focusedNode = currentWorkspace.disk.fileTree.nodeFromPath(focused);
      // const range = currentWorkspace.disk.fileTree.findRange(treeNode, focusedNode!) ?? [];
      const range1 = flatTree.findIndex((p) => p === treeNode.path);
      const range2 = anchorIndex < 0 ? flatTree.indexOf(treeNode.path) : anchorIndex;
      const range = flatTree.slice(Math.min(range1, range2), Math.max(range1, range2) + 1);

      setFileTreeCtx(({ anchorIndex }) => ({
        anchorIndex,
        editing: null,
        editType: null,
        focused: treeNode.path,
        virtual: null,
        selectedRange: range,
      }));
    } else if (!isEditing && !e.shiftKey && !isSelectedRange) {
      //select single file
      //ignore if within selection to allow for drag
      setFileTreeCtx(() => ({
        anchorIndex: flatTree.indexOf(treeNode.path),
        editing: null,
        editType: null,
        focused: treeNode.path,
        virtual: null,
        selectedRange: [treeNode.path],
      }));
    }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      return;
    }
    if (!e.shiftKey) {
      linkRef.current?.focus();
      setFileTreeCtx(() => ({
        anchorIndex: flatTree.indexOf(treeNode.path),
        editing: null,
        editType: null,
        focused: treeNode.path,
        virtual: null,
        selectedRange: [treeNode.path],
      }));
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // e.stopPropagation();
      if (virtual) {
        currentWorkspace.removeVirtualfile(virtual);
      }
      setFileTreeCtx({
        anchorIndex: -1,
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
          const wantPath = newFileName(fullPath, fileName); //basename(changePrefix(fullPath, strictPathname(prefix(fileName))));
          const gotPath = await commitChange(treeNode, wantPath, editType);
          const newFocused = gotPath ?? fullPath;
          if (gotPath !== null) {
            setFileName(basename(gotPath));
          }
          return setFileTreeCtx({
            anchorIndex: -1,
            editing: null,
            editType: null,
            virtual: null,
            focused: newFocused,
            selectedRange: [newFocused],
          });
        } else {
          return setFileTreeCtx({
            anchorIndex: -1,
            editing: null,
            editType: null,
            virtual: null,
            focused,
            selectedRange: focused ? [focused] : [],
          });
        }
      } /*is not editing  time to edit! */ else {
        return setFileTreeCtx({
          anchorIndex: -1,
          editing: treeNode.path,
          editType: "rename",
          virtual: null,
          focused: treeNode.path,
          selectedRange: [treeNode.path],
        });
      }
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isEditing && focused) {
      e.preventDefault();
      e.stopPropagation();
      const currentIndex = visibleFlatTree.indexOf(treeNode.path);
      const nextIndex = currentIndex + (e.key === "ArrowDown" ? 1 : -1);
      const nextPath = visibleFlatTree[nextIndex];

      if (nextPath && currentIndex !== -1) {
        const nextAnchorIndex = anchorIndex < 0 ? flatTree.indexOf(treeNode.path) : anchorIndex;
        setFileTreeCtx(({ selectedRange, anchorIndex, ...rest }) => {
          const actualNextIndex = flatTree.indexOf(nextPath);
          const start = Math.min(actualNextIndex, anchorIndex);
          const end = Math.max(actualNextIndex, anchorIndex) + 1;
          const range = e.shiftKey ? flatTree.slice(start, end) : selectedRange;
          return {
            ...rest,
            anchorIndex: e.shiftKey ? nextAnchorIndex : actualNextIndex,
            focused: nextPath,
            selectedRange: range,
          };
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
      // anchorIndex: anchorIndex < 0 ? flatTree.indexOf(treeNode.path) : anchorIndex,
      anchorIndex: flatTree.indexOf(treeNode.path),
      editing,
      editType,
      virtual,
      focused: treeNode.path,
      selectedRange: [treeNode.path],
    });
  };

  const handleBlur = (_e: React.FocusEvent<HTMLInputElement | HTMLAnchorElement>) => {
    if (virtual) currentWorkspace.removeVirtualfile(virtual);

    setFileTreeCtx(({ anchorIndex, focused, selectedRange }) => ({
      anchorIndex,
      editing: null,
      editType: null,
      virtual: null,
      focused,
      selectedRange,
    }));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.button === 2) return;
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
    isConflicted,
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
