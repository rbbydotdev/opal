import { INTERNAL_NODE_FILE_TYPE } from "@/components/FiletreeMenu";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { TreeNodeDataTransferJType } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { handleDropFilesForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { reduceLineage } from "@/lib/paths2";

export function useFileMenuPaste({ currentWorkspace }: { currentWorkspace: Workspace }) {
  // const uploadFilesToWorkspace =

  return async function handlePaste({ targetNode, data }: { targetNode: TreeNode; data: MetaDataTransfer }) {
    const {
      action,
      fileNodes,
      workspaceId: sourceWorkspaceId,
    } = data.getDataAsJson<TreeNodeDataTransferJType>(INTERNAL_NODE_FILE_TYPE);
    const sourceWorkspace =
      currentWorkspace.id === sourceWorkspaceId
        ? currentWorkspace
        : await WorkspaceDAO.FetchByNameOrId(
            sourceWorkspaceId ?? currentWorkspace.id /* todo should not be undefined but here we are */
          ).then((ws) => ws.toModel().init());

    if (action && fileNodes) {
      try {
        const sourceNodes = reduceLineage(fileNodes.map((path) => sourceWorkspace.nodeFromPath(path)!)).map((node) =>
          node.splice(targetNode.closestDir()!)
        );
        await currentWorkspace.copyMultipleSourceNodes(sourceNodes, sourceWorkspace.getDisk());

        if (action === "cut") {
          await sourceWorkspace.removeMultiple(sourceNodes.map((n) => n.source));
          // Clear the clipboard to prevent pasting the same "cut" content again.
          void navigator.clipboard.writeText("");
          //TOAST
        }
      } catch (error) {
        console.error("Failed to parse internal node data:", error);
      }
      return; // End execution after handling internal paste.
    }

    // 3. If no custom data, check if there are external files being pasted.
    // The new class proxies the `files` property directly.
    if (data.files.length > 0) {
      // Convert FileList to an array for the upload function.
      await handleDropFilesForNode({
        currentWorkspace,
        files: data.files,
        targetNode,
      });
      return;
    }

    // 4. (Optional) Handle other data types like plain text if necessary.
    const plainText = data.getData("text/plain");
    if (plainText) {
      // console.debug("Pasted plain text (unhandled):", plainText);
    }
  };
}
