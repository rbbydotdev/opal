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
      void navigator.clipboard.writeText("");
      try {
        const sameWorkspace = sourceWorkspace.id === currentWorkspace.id;
        const targetDir = targetNode.closestDir();
        const targetPath = targetNode.closestDirPath();

        const getSourceNodes = () =>
          reduceLineage(sourceWorkspace.nodesFromPaths(fileNodes)).map((node) => node.splice(targetDir!));

        if (action === "cut" || action === "move") {
          if (sameWorkspace) {
            // Move within the same workspace — rename only
            await currentWorkspace.renameMultiple(dropNodes(targetPath, sourceWorkspace.nodesFromPaths(fileNodes)));
            return fileNodes.length;
          }

          // Transfer between different workspaces
          const sourceNodes = getSourceNodes();
          await currentWorkspace.copyMultipleSourceNodes(sourceNodes, sourceWorkspace.disk);
          await sourceWorkspace.removeMultiple(sourceNodes.map((n) => n.source));
          return sourceNodes.length;
        }

        if (action === "copy") {
          const sourceNodes = getSourceNodes();
          await currentWorkspace.copyMultipleSourceNodes(sourceNodes, sourceWorkspace.disk);
          return sourceNodes.length;
        }

        console.error("Unknown clipboard action:", action);
        return 0;
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
