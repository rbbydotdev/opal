import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { prepareNodeDataTransfer } from "@/components/prepareNodeDataTransfer";
import { TreeNode } from "@/lib/FileTree/TreeNode";
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
