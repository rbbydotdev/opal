"use client";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { WorkspaceRouteType } from "@/context";
import { Workspace } from "@/Db/Workspace";
import { NotFoundError } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath, isAncestor, reduceLineage, relPath, RelPath } from "@/lib/paths";
import { usePathname, useRouter } from "next/navigation";

export function useWorkspaceFileMgmt(currentWorkspace: Workspace, workspaceRoute: WorkspaceRouteType) {
  const router = useRouter();
  const pathname = usePathname();
  const { setEditing, selectedRange, resetEditing, setEditType, editType, focused, setFocused, setVirtual, virtual } =
    useFileTreeMenuContext();

  const renameFile = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { path } = await currentWorkspace.renameFile(oldNode, newFullPath);
    if (workspaceRoute.path?.str === oldNode.path.str) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
    }
    return path;
  };

  const newFileFromNode = ({ path, type }: { path: AbsPath; type: TreeNode["type"] }) => {
    if (type === "file") return currentWorkspace.newFile(path.dirname(), path.basename(), "# " + path.basename());
    else {
      return currentWorkspace.newDir(path.dirname(), path.basename());
    }
  };
  const newFile = async (path: AbsPath, content = "") => {
    const newPath = await currentWorkspace.newFile(path.dirname(), path.basename(), content);
    if (!workspaceRoute.path) {
      router.push(currentWorkspace.resolveFileUrl(newPath));
    }
    return newPath;
  };
  const newDir = async (path: AbsPath) => {
    return currentWorkspace.newDir(path.dirname(), path.basename());
  };

  const removeFiles = async () => {
    const range = [...selectedRange];
    if (!range.length && focused) {
      range.push(focused.str);
    }
    if (!range.length) return;

    const paths = reduceLineage(range).map((pathStr) => absPath(pathStr));
    try {
      await Promise.all(paths.map((path) => currentWorkspace.removeFile(path)));
      if (workspaceRoute.path && range.includes(workspaceRoute.path.str)) {
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
  };

  const removeFocusedFile = async () => {
    if (!focused || !currentWorkspace.disk.pathExists(focused)) return;
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    if (!focusedNode) return;
    if (focusedNode.path.str === "/") return;

    try {
      await currentWorkspace.removeFile(focusedNode.path);
    } catch (e) {
      if (e instanceof NotFoundError) {
        //do nothing its okay
      } else {
        throw e;
      }
    }
    if (workspaceRoute.path?.str === focusedNode.path.str) {
      router.push(await currentWorkspace.tryFirstFileUrl());
    }
  };
  const cancelNew = () => {
    setVirtual(null);
    if (virtual) currentWorkspace.removeVirtualfile(virtual);
  };

  const addDirFile = (type: TreeNode["type"]) => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    const name = type === "dir" ? "New-Dir" : "newfile.md";
    const newNode = currentWorkspace.addVirtualFile({ type, name: relPath(name) }, focusedNode);
    setFocused(newNode.path);
    setEditing(newNode.path);
    setVirtual(newNode.path);
    setEditType("new");
    return newNode;
  };

  const renameDir = async (oldNode: TreeNode, newFullPath: AbsPath) => {
    const { path } = await currentWorkspace.renameDir(oldNode, newFullPath);
    if (isAncestor(workspaceRoute.path, oldNode.path.str) && workspaceRoute.path) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldNode.path, path));
    }
    return path;
  };
  const commitChange = async (oldNode: TreeNode, fileName: RelPath) => {
    const newPath = oldNode.path.dirname().join(fileName);
    if (editType === "rename") {
      if (oldNode.type === "dir") await renameDir(oldNode, newPath);
      else await renameFile(oldNode, newPath);
    } else if (editType === "new") {
      await newFileFromNode({ type: oldNode.type, path: newPath });
    }
    resetEditing();
    return newPath;
  };
  return {
    renameFile,
    renameDir,
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
