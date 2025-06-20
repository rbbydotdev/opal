"use client";
import { useFileTreeMenuContext } from "@/components/FileTreeProvider";
import { Workspace } from "@/Db/Workspace";
import { NotFoundError } from "@/lib/errors";
import { TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import {
  AbsPath,
  RelPath,
  absPath,
  basename,
  decodePath,
  dirname,
  duplicatePath,
  joinPath,
  reduceLineage,
  relPath,
} from "@/lib/paths2";
import React from "react";
import { isVirtualDupNode } from "../lib/FileTree/TreeNode";

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

  const duplicateDirFile = React.useCallback(
    (type: TreeNode["type"], from: AbsPath | TreeNode) => {
      const fromNode = currentWorkspace.nodeFromPath(String(from));
      if (!fromNode) {
        throw new Error("Parent node not found");
      }

      const newNode = currentWorkspace.addVirtualFileFromSource(
        { type, name: relPath(duplicatePath(fromNode.path)), sourceNode: fromNode },
        fromNode.parent ?? fromNode
      );
      setFocused(newNode.path);
      setEditing(newNode.path);
      setVirtual(newNode.path);
      setEditType("duplicate");
      return newNode;
    },
    [currentWorkspace, setFocused, setEditing, setVirtual, setEditType]
  );
  const addDirFile = React.useCallback(
    (type: TreeNode["type"], parent: TreeDir | AbsPath) => {
      const parentNode = currentWorkspace.nodeFromPath(String(parent)) ?? null;
      if (!parentNode) {
        throw new Error("Parent node not found");
      }
      const name = type === "dir" ? "newdir" : "newfile.md";
      const newNode = currentWorkspace.addVirtualFile({ type, name: relPath(name) }, parentNode);
      setFocused(newNode.path);
      setEditing(newNode.path);
      setVirtual(newNode.path);
      setEditType("new");
      return newNode;
    },
    [currentWorkspace, setFocused, setEditing, setVirtual, setEditType]
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
      } else if (type === "duplicate") {
        if (isVirtualDupNode(origNode)) {
          return currentWorkspace.copyFile(origNode.source, wantPath);
        } else {
          throw new Error("Cannot duplicate a non-virtual node");
        }
      } else if (type === "rename") {
        return renameDirOrFile(origNode, wantPath);
      } else {
        throw new Error("invalid commit type");
      }
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
    removeFiles,
    removeFile,
    cancelNew,
    resetEditing,
    setEditing,
    setFocused,
    duplicateDirFile,
  };
}
