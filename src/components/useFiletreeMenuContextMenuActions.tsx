import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { flatUniqNodeArgs } from "@/components/flatUniqNodeArgs";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/SidebarFileMenu/hooks/useFileMenuPaste";
import { Workspace } from "@/data/Workspace";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export function useFiletreeMenuContextMenuActions({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const handleFileMenuPaste = useFileMenuPaste({ currentWorkspace });
  const { setFileTreeCtx } = useFileTreeMenuCtx();
  const { addDirFile, duplicateDirFile, trashFiles, untrashFiles, removeFiles } =
    useWorkspaceFileMgmt(currentWorkspace);

  const addFile = (fileNode: TreeNode, filename?: string) => addDirFile("file", fileNode.closestDir()!, filename);
  const addDir = (fileNode: TreeNode) => addDirFile("dir", fileNode.closestDir()!);
  const trash = (...nodes: (AbsPath | TreeNode | AbsPath[] | TreeNode[])[]) => trashFiles(flatUniqNodeArgs(nodes));

  const copy = (fileNodes: TreeNode[]) =>
    copyFileNodesToClipboard({
      fileNodes,
      action: "copy",
      workspaceId: currentWorkspace.id,
    });
  const cut = (fileNodes: TreeNode[]) =>
    copyFileNodesToClipboard({
      fileNodes,
      action: "cut",
      workspaceId: currentWorkspace.id,
    }).then(() => {
      setFileTreeCtx(({ anchorIndex }) => ({
        anchorIndex,
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      }));
    });
  const paste = async (fileNode: TreeNode) => {
    const data = await MetaDataTransfer.fromClipboard(await navigator.clipboard.read());
    void handleFileMenuPaste({
      targetNode: fileNode,
      data,
    });

    return setFileTreeCtx(({ anchorIndex }) => ({
      anchorIndex,
      editing: null,
      editType: null,
      focused: null,
      virtual: null,
      selectedRange: [],
    }));
  };
  const duplicate = (fileNode: TreeNode) => duplicateDirFile(fileNode.type, fileNode);
  const rename = (fileNode: TreeNode) =>
    setFileTreeCtx(({ anchorIndex }) => ({
      anchorIndex,
      editing: fileNode.path,
      editType: "rename",
      focused: fileNode.path,
      virtual: null,
      selectedRange: [fileNode.path],
    }));
  const untrash = (...fileNodes: (TreeNode | AbsPath | AbsPath[] | TreeNode[])[]) =>
    untrashFiles(flatUniqNodeArgs(fileNodes));
  const remove = (...fileNodes: (TreeNode | AbsPath | AbsPath[] | TreeNode[])[]) =>
    removeFiles(flatUniqNodeArgs(fileNodes));

  return {
    addFile,
    addDir,
    trash,
    copy,
    cut,
    paste,
    duplicate,
    rename,
    untrash,
    remove,
  };
}
