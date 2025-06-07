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
      return currentWorkspace.newFile(absPath(dirname(path)), relPath(basename(path)), content);
    },
    [currentWorkspace]
  );

  const newDir = React.useCallback(
    async (path: AbsPath) => {
      return currentWorkspace.newDir(absPath(dirname(path)), relPath(basename(path)));
    },
    [currentWorkspace]
  );

  const removeSelectedFiles = React.useCallback(async () => {
    const range = ([] as AbsPath[]).concat(selectedRange.map(absPath), focused ? [focused] : []);
    if (!range.length && focused) {
      range.push(focused);
    }
    if (!range.length) return;

    const paths = reduceLineage(range).map((pathStr) => absPath(pathStr));
    try {
      await Promise.all(paths.map((path) => currentWorkspace.removeFile(path)));
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.error(e);
      } else {
        throw e;
      }
    }
    resetSelects();
  }, [currentWorkspace, focused, resetSelects, selectedRange]);

  const removeFocusedFile = React.useCallback(async () => {
    if (!focused || !currentWorkspace.disk.pathExists(focused)) return;
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    if (!focusedNode) return;
    if (focusedNode.path === "/") return;

    try {
      await currentWorkspace.removeFile(focusedNode.path);
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.error(e);
      } else {
        throw e;
      }
    }
  }, [focused, currentWorkspace]);

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

  const renameDirOrFile = React.useCallback(
    async (oldNode: TreeNode, newFullPath: AbsPath) => {
      const { path } = oldNode.isTreeDir()
        ? await currentWorkspace.renameDir(oldNode, newFullPath)
        : await currentWorkspace.renameFile(oldNode, newFullPath);

      resetSelects();
      return path;
    },
    [currentWorkspace, resetSelects]
  );

  const commitChange = React.useCallback(
    async (origNode: TreeNode, fileName: RelPath, type: "rename" | "new") => {
      const wantPath = joinPath(absPath(dirname(origNode.path)), relPath(decodePath(fileName)));
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
      return renameDirOrFile(origNode, wantPath);
    },
    [currentWorkspace, renameDirOrFile]
  );
  return {
    renameDirOrFile,
    newFile,
    removeFocusedFile,
    removeFiles: removeSelectedFiles,
    newDir,
    commitChange,
    addDirFile,
    cancelNew,
    resetEditing,
    setEditing,
    setFocused,
  };
}
