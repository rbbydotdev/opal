"use client";
import { useFileTreeMenuContext } from "@/components/FileTreeProvider";
import { Workspace } from "@/Db/Workspace";
import { NotFoundError } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import {
  AbsPath,
  RelPath,
  absPath,
  basename,
  decodePath,
  dirname,
  joinPath,
  reduceLineage,
  relPath,
} from "@/lib/paths2";
import React from "react";

export function useWorkspaceFileMgmt(currentWorkspace: Workspace) {
  const {
    setEditing,
    selectedRange,
    resetSelects,
    resetEditing,
    setEditType,
    focused,
    setFocused,
    setVirtual,
    virtual,
  } = useFileTreeMenuContext();

  const newFile = React.useCallback(
    (path: AbsPath, content = "") => {
      return currentWorkspace.newFile(dirname(path), basename(path), content);
    },
    [currentWorkspace]
  );
  const duplicateFile = React.useCallback(
    (treeNode: TreeNode) => {
      const type = treeNode.type;
      const focusedNode = focused ? currentWorkspace.nodeFromPath(focused) : null;
      const name = type === "dir" ? "newdir" : "newfile.md";
      const newNode = currentWorkspace.addVirtualFile({ type, name: relPath(name) }, focusedNode);
      setFocused(newNode.path);
      setEditing(newNode.path);
      setVirtual(newNode.path);
      setEditType("new");
      return newNode;
    },
    [focused, currentWorkspace, setFocused, setEditing, setVirtual, setEditType]
  );

  const newDir = React.useCallback(
    async (path: AbsPath) => {
      return currentWorkspace.newDir(dirname(path), basename(path));
    },
    [currentWorkspace]
  );

  const removeFiles = React.useCallback(
    async (paths: AbsPath[]) => {
      if (!paths.length) return;
      try {
        await currentWorkspace.removeMultipleFiles(reduceLineage(paths).map((pathStr) => absPath(pathStr)));
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.error(e);
        } else {
          throw e;
        }
      }
      resetSelects();
    },
    [currentWorkspace, resetSelects]
  );
  const removeFile = React.useCallback(
    (path: AbsPath) => {
      return removeFiles([path]);
    },
    [removeFiles]
  );

  const removeSelectedFiles = React.useCallback(async () => {
    const range = ([] as AbsPath[]).concat(selectedRange.map(absPath), focused ? [focused] : []);
    if (!range.length && focused) {
      range.push(focused);
    }
    await removeFiles(range);
  }, [focused, removeFiles, selectedRange]);

  const removeFocusedFile = React.useCallback(async () => {
    if (!focused) {
      return;
    }
    await removeFiles([focused]);
  }, [focused, removeFiles]);

  const cancelNew = React.useCallback(() => {
    setVirtual(null);
    if (virtual) currentWorkspace.removeVirtualfile(virtual);
  }, [setVirtual, virtual, currentWorkspace]);

  const addDirFile = React.useCallback(
    (type: TreeNode["type"]) => {
      const focusedNode = focused ? currentWorkspace.nodeFromPath(focused) : null;
      const name = type === "dir" ? "newdir" : "newfile.md";
      const newNode = currentWorkspace.addVirtualFile({ type, name: relPath(name) }, focusedNode);
      setFocused(newNode.path);
      setEditing(newNode.path);
      setVirtual(newNode.path);
      setEditType("new");
      return newNode;
    },
    [focused, currentWorkspace, setFocused, setEditing, setVirtual, setEditType]
  );

  const renameDirOrFileMultiple = React.useCallback(
    async (nodes: [oldNode: TreeNode, newFullPath: TreeNode | AbsPath][]) => {
      const result = await currentWorkspace.renameMultiple(nodes);
      if (result.length === 0) return [];
      resetSelects();
      return result;
    },
    [currentWorkspace, resetSelects]
  );

  const renameDirOrFile = React.useCallback(
    async (origNode: TreeNode, newFullPath: TreeNode | AbsPath) => {
      const result = await renameDirOrFileMultiple([[origNode, newFullPath]] as [TreeNode, TreeNode | AbsPath][]);
      if (result.length === 0) return null;
      return result[0].newPath;
    },
    [renameDirOrFileMultiple]
  );

  const commitChange = React.useCallback(
    async (origNode: TreeNode, fileName: RelPath, type: "rename" | "new" | "duplicate"): Promise<AbsPath | null> => {
      const wantPath = joinPath(dirname(origNode.path), relPath(decodePath(fileName)));
      if (type === "new") {
        if (origNode.isTreeFile())
          return currentWorkspace.newFile(
            absPath(dirname(wantPath)),
            relPath(basename(wantPath)),
            "# " + basename(wantPath)
          );
        else {
          return currentWorkspace.newDir(absPath(dirname(wantPath)), relPath(basename(wantPath)));
        }
      }
      if (type === "duplicate") {
        return wantPath;
      }
      if (type === "rename") {
        return renameDirOrFile(origNode, wantPath);
      }
      throw new Error("invalid commit type");
    },
    [currentWorkspace, renameDirOrFile]
  );
  return {
    renameDirOrFileMultiple,
    renameDirOrFile,
    newFile,
    removeFocusedFile,
    removeSelectedFiles,
    newDir,
    commitChange,
    addDirFile,
    duplicateFile,
    removeFiles,
    removeFile,
    cancelNew,
    resetEditing,
    setEditing,
    setFocused,
  };
}
