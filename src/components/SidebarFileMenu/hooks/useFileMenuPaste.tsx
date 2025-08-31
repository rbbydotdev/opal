import { INTERNAL_NODE_FILE_TYPE } from "@/components/FiletreeMenu";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { TreeNodeDataTransferJType } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { handleDropFilesForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, joinPath } from "@/lib/paths2";

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

    // console.log(reduceLineage(fileNodes!));
    if (action && fileNodes) {
      try {
        const copyNodes: [from: TreeNode, to: AbsPath][] = fileNodes.map(
          (path) =>
            [
              sourceWorkspace.nodeFromPath(path)!, // from
              joinPath(targetNode.closestDirPath(), basename(path)), // to
            ] as const
        );
        if (copyNodes.length === 0) return;

        if (sourceWorkspaceId && currentWorkspace.id !== sourceWorkspaceId) {
          //Transfer Across Workspace
          //can make this just do a plain copy when workids are the same
          await currentWorkspace.transferFiles(copyNodes, sourceWorkspaceId, currentWorkspace);
          //TOAST
        } else {
          //some redundancy with transferFiles
          // TODO: rename images in markdown && expand menu for item
          await currentWorkspace.copyMultipleFiles(copyNodes);

          if (action === "cut") {
            await currentWorkspace.removeMultiple(copyNodes.map(([from]) => from));
            // Clear the clipboard to prevent pasting the same "cut" content again.
            void navigator.clipboard.writeText("");
            //TOAST
          }
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
