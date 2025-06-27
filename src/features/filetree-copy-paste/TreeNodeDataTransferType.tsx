import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export type TreeNodeDataTransferType = {
  workspaceId: string;
  fileNodes: AbsPath[] | TreeNode[];
  action: "copy" | "cut" | "move";
};
export type TreeNodeDataTransferJType = TreeNodeDataTransferType & { fileNodes: AbsPath[] };
export function treeNodeDataTransfer({
  workspaceId,
  fileNodes,
  action,
}: TreeNodeDataTransferType): TreeNodeDataTransferJType {
  return {
    workspaceId,
    fileNodes: fileNodes.map((node) => String(node) as AbsPath),
    action,
  };
}
