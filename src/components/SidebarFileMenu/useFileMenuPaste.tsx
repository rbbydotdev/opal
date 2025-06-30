"use client";
import { INTERNAL_NODE_FILE_TYPE } from "@/components/FiletreeMenu";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { Workspace } from "@/Db/Workspace";
import { TreeNodeDataTransferJType } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { useHandleDropFilesForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, joinPath } from "@/lib/paths2";
import { useCallback } from "react";

export function useFileMenuPaste({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const uploadFilesToWorkspace = useHandleDropFilesForNode({
    currentWorkspace,
  });

  return useCallback(
    async function handlePaste({ targetNode, data }: { targetNode: TreeNode; data: MetaDataTransfer }) {
      const { action, fileNodes } = data.getDataAsJson<TreeNodeDataTransferJType>(INTERNAL_NODE_FILE_TYPE);
      if (action && fileNodes) {
        try {
          const copyNodes = fileNodes
            .map(
              (path) =>
                [
                  currentWorkspace.nodeFromPath(path)!, // from
                  joinPath(targetNode.closestDirPath(), basename(path)), // to
                ] as const
            )
            .filter(([from, to]) => from && String(from.path) !== String(to)) as [TreeNode, AbsPath][];

          if (copyNodes.length === 0) return;

          // TODO: rename images in markdown && expand menu for item
          await currentWorkspace.copyMultipleFiles(copyNodes);

          if (action === "cut") {
            await currentWorkspace.removeMultiple(copyNodes.map(([from]) => from));
            // Clear the clipboard to prevent pasting the same "cut" content again.
            void navigator.clipboard.writeText("");
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
        await uploadFilesToWorkspace({
          files: data.files,
          targetNode,
        });
        return;
      }

      // 4. (Optional) Handle other data types like plain text if necessary.
      const plainText = data.getData("text/plain");
      if (plainText) {
        console.log("Pasted plain text (unhandled):", plainText);
      }
    },
    [currentWorkspace, uploadFilesToWorkspace]
  );
}
