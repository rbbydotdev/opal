"use client";
import { TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { WorkspaceRouteType } from "@/context";
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
    // if (!workspaceRoute.path) {
    //   router.push(currentWorkspace.resolveFileUrl(newPath));
    // }
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

    // if (workspaceRoute.path && range.includes(workspaceRoute.path.str)) {
    //   const firstFile = currentWorkspace.disk.getFirstFile();
    //   if (firstFile) {
    //     router.push(currentWorkspace.resolveFileUrl(firstFile.path));
    //   } else {
    //     router.push(currentWorkspace.href);
    //   }
    // }

    const paths = reduceLineage(range).map((pathStr) => absPath(pathStr));
    // console.log(selectedRange, paths);
    return Promise.all(paths.map((path) => currentWorkspace.removeFile(path)));
  };

  const removeFocusedFile = async () => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    if (!focusedNode) return;
    if (focusedNode.path.str === "/") return;

    await currentWorkspace.removeFile(focusedNode.path);
    // if (workspaceRoute.path?.str === focusedNode.path.str) {
    //   const firstFile = currentWorkspace.disk.getFirstFile();
    //   if (firstFile) {
    //     router.push(currentWorkspace.resolveFileUrl(firstFile.path));
    //   } else {
    //     router.push(currentWorkspace.href);
    //   }
    // }
  };
  const cancelNew = () => {
    setVirtual(null);
    if (virtual) currentWorkspace.removeVirtualfile(virtual);
  };

  const addDirFile = (type: TreeNode["type"]) => {
    const focusedNode = currentWorkspace.nodeFromPath(focused);
    const newNode = currentWorkspace.addVirtualFile({ type, name: relPath("new" + type) }, focusedNode);
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
      await renameFile(oldNode, newPath);
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
