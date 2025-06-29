"use client";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { Workspace } from "@/Db/Workspace";
import { useHandleDropFilesForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, joinPath } from "@/lib/paths2";
import { useCallback } from "react";

export function useFileMenuPaste({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const uploadFilesToWorkspace = useHandleDropFilesForNode({ currentWorkspace });
  return useCallback(
    async function handlePaste({ targetNode, data }: { targetNode: TreeNode; data: MetaDataTransfer }) {
      if (data.hasInternalDataType()) {
        const { fileNodes, action } = data.toInternalDataTransfer()!;
        const copyNodes = fileNodes
          .map((path) => [
            currentWorkspace.nodeFromPath(path)!, //from
            joinPath(targetNode.closestDirPath(), basename(path)), //to
          ])
          .filter(([from, to]) => String(from) !== to) as [TreeNode, AbsPath][];
        await currentWorkspace.copyMultipleFiles(copyNodes);
        if (action === "cut") {
          await currentWorkspace.removeMultiple(copyNodes.map(([from]) => from));
          void navigator.clipboard.writeText("");
          return;
        }
      } else {
        //is external file paste
        await uploadFilesToWorkspace({ files: data.getFiles(), targetNode });
      }
    },
    [currentWorkspace, uploadFilesToWorkspace]
  );
}
