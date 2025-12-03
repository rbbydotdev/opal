import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { prepareNodeDataTransfer } from "@/components/prepareNodeDataTransfer";
import { Workspace } from "@/data/Workspace";
import {
  TreeNodeDataTransferJType,
  TreeNodeDataTransferType,
} from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath } from "@/lib/paths2";
import React from "react";
// prepareNodeDataTransfer
export async function copyFileNodesToClipboard({
  fileNodes,
  action,
  workspaceId,
}: {
  fileNodes: TreeNode[];
  workspaceId: string;
  action: "copy" | "cut";
}) {
  try {
    const metaDataTransfer = prepareNodeDataTransfer({
      dataTransfer: new MetaDataTransfer(),
      nodes: fileNodes,
      workspaceId,
      action,
    });
    return navigator.clipboard.write([await metaDataTransfer.toClipboardItem()]);
  } catch (err) {
    console.error("Failed to copy HTML to clipboard:", err);
  }
  return Promise.resolve();
}
