import { INTERNAL_NODE_FILE_TYPE } from "@/components/filetree/FiletreeMenu";
import { dropNodes, TreeNode } from "@/components/filetree/TreeNode";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { TreeNodeDataTransferJType } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { handleDropFilesForNode } from "@/hooks/useFileTreeDragDrop";
import { reduceLineage } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";

export function useFileMenuPaste({ currentWorkspace }: { currentWorkspace: Workspace }) {
  return async function handlePaste({
    targetNode,
    data,
  }: {
    targetNode: TreeNode;
    data: MetaDataTransfer;
  }): Promise<number> {
    const {
      action,
      fileNodes,
      workspaceId: sourceWorkspaceId,
    } = data.getDataAsJson<TreeNodeDataTransferJType>(INTERNAL_NODE_FILE_TYPE);

    const sourceWorkspace =
      currentWorkspace.id === sourceWorkspaceId
        ? currentWorkspace
        : await WorkspaceDAO.FetchByNameOrId(sourceWorkspaceId ?? currentWorkspace.id).then((ws) =>
            Workspace.FromDAO(ws).init()
          );

    if (action && fileNodes) {
      try {
        const sourceNodes = reduceLineage(fileNodes.map((path) => sourceWorkspace.nodeFromPath(path)!)).map((node) =>
          node.splice(targetNode.closestDir()!)
        );

        await currentWorkspace.copyMultipleSourceNodes(sourceNodes, sourceWorkspace.getDisk());

        if (action === "cut") {
          //if its the same workspace its a move not a remove + add
          if (sourceWorkspace.id === currentWorkspace.id) {
            const targetPath = targetNode.closestDirPath();
            await currentWorkspace.renameMultiple(dropNodes(targetPath, sourceNodes));
            return sourceNodes.length;
          }
          await sourceWorkspace.removeMultiple(sourceNodes.map((n) => n.source));
          void navigator.clipboard.writeText("");
        }
        return sourceNodes.length;
      } catch (error) {
        console.error("Failed to parse internal node data:", error);
        return 0;
      }
    }

    if (data.files.length > 0) {
      await handleDropFilesForNode({
        currentWorkspace,
        files: data.files,
        targetNode,
      });
      return data.files.length;
    }

    const plainText = data.getData("text/plain");
    if (plainText) {
      return 0;
    }

    return 0;
  };
}
