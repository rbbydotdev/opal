"use client";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { WorkspaceRouteType } from "@/context";
import { Workspace } from "@/Db/Workspace";
import { NotFoundError } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import {
  AbsolutePath2,
  RelativePath2,
  absPath,
  basename,
  decodePath,
  dirname,
  isAncestor,
  joinPath,
  reduceLineage,
  relPath,
} from "@/lib/paths2";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export function useWorkspaceFileMgmt(currentWorkspace: Workspace, workspaceRoute: WorkspaceRouteType) {
  const router = useRouter();
  const pathname = usePathname();
  const { setEditing, selectedRange, resetEditing, setEditType, focused, setFocused, setVirtual, virtual } =
    useFileTreeMenuContext();

  const newFile = React.useCallback(
    async (path: AbsolutePath2, content = "") => {
      const newPath = await currentWorkspace.newFile(absPath(dirname(path)), relPath(basename(path)), content);
      if (!workspaceRoute.path) {
        router.push(currentWorkspace.resolveFileUrl(newPath));
      }
      return newPath;
    },
    [currentWorkspace, workspaceRoute.path, router]
  );

  const newDir = React.useCallback(
    async (path: AbsolutePath2) => {
      return currentWorkspace.newDir(absPath(dirname(path)), relPath(basename(path)));
    },
    [currentWorkspace]
  );

  const removeFiles = React.useCallback(async () => {
    const range = [...selectedRange];
    if (!range.length && focused) {
      range.push(focused as string);
    }
    if (!range.length) return;

    const paths = reduceLineage(range).map((pathStr) => absPath(pathStr));
    try {
      await Promise.all(paths.map((path) => currentWorkspace.removeFile(path)));
      if (workspaceRoute.path && range.includes(workspaceRoute.path as string)) {
        router.push(await currentWorkspace.tryFirstFileUrl());
      }
    } catch (e) {
      if (e instanceof NotFoundError) {
        console.error(e); //???
      } else {
        throw e;
      }
    }
    setFocused(null);
  }, [selectedRange, focused, currentWorkspace, workspaceRoute.path, router, setFocused]);

  const removeFocusedFile = React.useCallback(async () => {
    if (!focused || !currentWorkspace.disk.pathExists(focused)) return;
    const focusedNode = currentWorkspace.nodeFromPath(focused as string);
    if (!focusedNode) return;
    if ((focusedNode.path as string) === "/") return;

    try {
      await currentWorkspace.removeFile(focusedNode.path);
    } catch (e) {
      if (e instanceof NotFoundError) {
        //do nothing its okay
      } else {
        throw e;
      }
    }
    if (workspaceRoute.path && (workspaceRoute.path as string) === (focusedNode.path as string)) {
      router.push(await currentWorkspace.tryFirstFileUrl());
    }
  }, [focused, currentWorkspace, workspaceRoute.path, router]);

  const cancelNew = React.useCallback(() => {
    setVirtual(null);
    if (virtual) currentWorkspace.removeVirtualfile(virtual);
  }, [setVirtual, virtual, currentWorkspace]);

  const addDirFile = React.useCallback(
    (type: TreeNode["type"]) => {
      const focusedNode = focused ? currentWorkspace.nodeFromPath(focused as string) : null;
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
    async (oldNode: TreeNode, newFullPath: AbsolutePath2) => {
      const { path } =
        oldNode.type === "dir"
          ? await currentWorkspace.renameDir(oldNode, newFullPath)
          : await currentWorkspace.renameFile(oldNode, newFullPath);

      if (
        workspaceRoute.path &&
        (isAncestor(workspaceRoute.path as string, oldNode.path as string) ||
          (workspaceRoute.path as string) === (oldNode.path as string))
      ) {
        router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
      }
      return path;
    },
    [currentWorkspace, workspaceRoute.path, router, pathname]
  );

  // const renameDir = React.useCallback(
  //   async (oldNode: TreeNode, newFullPath: AbsPath) => {
  //     const { path } = await currentWorkspace.renameDir(oldNode, newFullPath);
  //     if (isAncestor(workspaceRoute.path, oldNode.path.str) && workspaceRoute.path) {
  //       router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
  //     }
  //     return path;
  //   },
  //   [currentWorkspace, workspaceRoute.path, router, pathname]
  // );

  // const renameFile = React.useCallback(
  //   async (oldNode: TreeNode, newFullPath: AbsPath) => {
  //     const { path } = await currentWorkspace.renameFile(oldNode, newFullPath);
  //     if (workspaceRoute.path?.str === oldNode.path.str) {
  //       router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
  //     }
  //     return path;
  //   },
  //   [currentWorkspace, workspaceRoute.path, router, pathname]
  // );

  // const renameDirOrFile = React.useCallback(
  //   async (oldNode: TreeNode, newFullPath: AbsPath, type: "dir" | "file") => {
  //     if (type === "file") {
  //       return renameFile(oldNode, newFullPath);
  //     }
  //     return renameDir(oldNode, newFullPath);
  //   },
  //   [renameFile, renameDir]
  // );

  const commitChange = React.useCallback(
    async (origNode: TreeNode, fileName: RelativePath2, type: "rename" | "new") => {
      const wantPath = joinPath(absPath(dirname(origNode.path)), relPath(decodePath(fileName)));
      if (type === "new") {
        if (origNode.type === "file")
          return currentWorkspace.newFile(
            absPath(dirname(wantPath)),
            relPath(basename(wantPath)),
            "# " + basename(wantPath)
          );
        else {
          return currentWorkspace.newDir(absPath(dirname(wantPath)), relPath(basename(wantPath)));
        }
      }
      // return origNode.type === "dir" ? await renameDir(origNode, wantPath) : await renameFile(origNode, wantPath);
      return renameDirOrFile(origNode, wantPath);
    },
    [currentWorkspace, renameDirOrFile]
  );
  return {
    // renameFile,
    // renameDir,
    renameDirOrFile,
    newFile,
    removeFocusedFile,
    removeFiles,
    newDir,
    commitChange,
    addDirFile,
    cancelNew,
    resetEditing,
    setEditing,
    setFocused,
  };
}
