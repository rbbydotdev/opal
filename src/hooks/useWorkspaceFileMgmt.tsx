"use client";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
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
  const { setFileTreeCtx, selectedRange, resetEditing, focused } = useFileTreeMenuCtx();

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

  const trashFiles = React.useCallback(
    async (paths: AbsPath[]) => {
      if (!paths.length) return;
      try {
        await currentWorkspace.trashMultiple(reduceLineage(paths));
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.error(e);
        } else {
          throw e;
        }
      }
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      });
    },
    [currentWorkspace, setFileTreeCtx]
  );

  const removeFiles = React.useCallback(
    async (paths: AbsPath[]) => {
      if (!paths.length) return;
      try {
        await currentWorkspace.removeMultiple(reduceLineage(paths).map((pathStr) => absPath(pathStr)));
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.error(e);
        } else {
          throw e;
        }
      }
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      });
    },
    [currentWorkspace, setFileTreeCtx]
  );
  const removeFile = React.useCallback(
    (path: AbsPath) => {
      return removeFiles([path]);
    },
    [removeFiles]
  );
  const trashFile = React.useCallback(
    async (path: AbsPath) => {
      return trashFiles([path]);
    },
    [trashFiles]
  );

  const removeSelectedFiles = React.useCallback(async () => {
    const range = ([] as AbsPath[]).concat(selectedRange.map(absPath), focused ? [focused] : []);

    if (!range.length && focused) {
      range.push(focused);
    }
    await removeFiles(range);
  }, [focused, removeFiles, selectedRange]);

  const untrashFiles = React.useCallback(
    async (filePaths: AbsPath[]) => {
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      });
      return currentWorkspace.untrashMultiple(filePaths);
    },
    [currentWorkspace, setFileTreeCtx]
  );

  const trashSelectedFiles = React.useCallback(() => {
    const range = ([] as AbsPath[]).concat(selectedRange.map(absPath), focused ? [focused] : []);
    if (!range.length && focused) {
      range.push(focused);
    }
    setFileTreeCtx({
      editing: null,
      editType: null,
      focused: null,
      virtual: null,
      selectedRange: [],
    });
    return currentWorkspace.trashMultiple(reduceLineage(range));
  }, [currentWorkspace, focused, selectedRange, setFileTreeCtx]);

  const removeFocusedFile = React.useCallback(async () => {
    if (focused) await removeFiles([focused]);
  }, [focused, removeFiles]);

  const duplicateDirFile = React.useCallback(
    (type: TreeNode["type"], from: AbsPath | TreeNode) => {
      const fromNode = currentWorkspace.nodeFromPath(String(from));
      if (!fromNode) {
        throw new Error("Parent node not found");
      }

      const newNode = currentWorkspace.addVirtualFileFromSource(
        { type, name: basename(duplicatePath(fromNode.path)), sourceNode: fromNode },
        fromNode.parent ?? fromNode
      );

      setFileTreeCtx({
        editing: newNode.path,
        editType: "duplicate",
        focused: newNode.path,
        virtual: newNode.path,
        selectedRange: [],
      });

      return newNode;
    },
    [currentWorkspace, setFileTreeCtx]
  );
  const addDirFile = React.useCallback(
    (type: TreeNode["type"], parent: TreeDir | AbsPath) => {
      /** --------- TODO: move me somewhere more appropriate start ------ */
      let parentNode = currentWorkspace.nodeFromPath(String(parent)) ?? null;
      if (!parentNode) {
        console.warn("Parent node not found for adding new file or directory");
      }
      if ((parentNode && parentNode?.isVirtual) || !parentNode) {
        parentNode = parentNode?.parent ?? currentWorkspace.getFileTreeRoot();
      }
      /** --------- end ------ */
      const name = type === "dir" ? "newdir" : "newfile.md";
      const newNode = currentWorkspace.addVirtualFile({ type, name: relPath(name) }, parentNode);
      setFileTreeCtx({
        editing: newNode.path,
        editType: "new",
        focused: newNode.path,
        virtual: newNode.path,
        selectedRange: [],
      });
      return newNode;
    },
    [currentWorkspace, setFileTreeCtx]
  );

  const renameDirOrFileMultiple = React.useCallback(
    async (nodes: [oldNode: TreeNode, newFullPath: TreeNode | AbsPath][]) => {
      const result = await currentWorkspace.renameMultiple(nodes);
      if (result.length === 0) return [];

      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      });
      return result;
    },
    [currentWorkspace, setFileTreeCtx]
  );

  const renameDirOrFile = React.useCallback(
    async (origNode: TreeNode, newFullPath: TreeNode | AbsPath) => {
      const result = await renameDirOrFileMultiple([[origNode, newFullPath]] as [TreeNode, TreeNode | AbsPath][]);
      if (result.length <= 0) return null;
      return result[0]!.newPath;
    },
    [renameDirOrFileMultiple]
  );

  const commitChange = React.useCallback(
    async (origNode: TreeNode, fileName: RelPath, type: "rename" | "new" | "duplicate"): Promise<AbsPath | null> => {
      const wantPath = joinPath(dirname(origNode.path), relPath(decodePath(fileName)));
      if (type === "new") {
        if (origNode.isTreeFile())
          return currentWorkspace.newFile(dirname(wantPath), basename(wantPath), "# " + basename(wantPath));
        else {
          return currentWorkspace.newDir(dirname(wantPath), basename(wantPath));
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
    trashSelectedFiles,
    removeFiles,
    removeFile,
    resetEditing,
    duplicateDirFile,
    untrashFiles,
    trashFile,
    trashFiles,
  };
}
