import { INTERNAL_NODE_FILE_TYPE } from "@/components/FiletreeMenu";
import { Workspace } from "@/Db/Workspace";
import { treeNodeDataTransfer } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath, encodePath, isImage, isMarkdown, prefix } from "@/lib/paths2";

// function isInternalFileTreeNode(item: ClipboardItem | DataTransferItem) {
//   if (item instanceof ClipboardItem) {
//     return item.types.includes(INTERNAL_NODE_FILE_TYPE);
//   }
//   if (item instanceof DataTransferItem) {
//     return item.type === INTERNAL_NODE_FILE_TYPE || item.type.includes(INTERNAL_NODE_FILE_TYPE);
//   }
// }

export const prepareNodeDataTransfer = ({
  dataTransfer,
  selectedRange,
  focused,
  currentWorkspace,
  targetNode,
  action,
}: {
  currentWorkspace: Workspace;
  selectedRange: AbsPath[] | string[];
  focused?: AbsPath | null;
  dataTransfer: DataTransfer;
  targetNode?: TreeNode;
  action: "copy" | "cut" | "move";
}) => {
  const fileNodes = Array.from(new Set([...selectedRange, targetNode?.path, focused ? focused : null]))
    .filter(Boolean)
    .map((entry) => currentWorkspace.disk.fileTree.nodeFromPath(absPath(entry)))
    .filter(Boolean);

  try {
    const data = JSON.stringify(treeNodeDataTransfer({ fileNodes, action, workspaceId: currentWorkspace.name }));

    dataTransfer.clearData();
    dataTransfer.effectAllowed = "all";
    dataTransfer.setData(INTERNAL_NODE_FILE_TYPE, data);
    dataTransfer.setData(
      "text/html",
      fileNodes
        .map((node) => node.path)
        .filter(isImage)
        .map((path) => `<img src="${encodePath(path) || ""}" />`)
        .join(" ")
    );
    dataTransfer.setData(
      "text/html",
      fileNodes
        .map((node) => node.path)
        .filter(isMarkdown)
        .map((path) => `<a href="${encodePath(path) || ""}">${capitalizeFirst(prefix(path))}</a>`)
        .join(" ")
    );
    fileNodes.forEach((node, i) => {
      dataTransfer.setData(`${node.getMimeType()};index=${i}`, encodePath(node.path));
    });
    dataTransfer.setData(INTERNAL_NODE_FILE_TYPE, data);
  } catch (e) {
    console.error("Error preparing node data for drag and drop:", e);
  }
  return dataTransfer;
};
