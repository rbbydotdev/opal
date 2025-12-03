import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { TreeNode } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { prepareNodeDataTransfer } from "@/features/filetree-copy-paste/prepareNodeDataTransfer";
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
