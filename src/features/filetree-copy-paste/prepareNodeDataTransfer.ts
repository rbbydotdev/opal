import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { TreeNode } from "@/components/filetree/TreeNode";
import { treeNodeDataTransfer } from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { isImage, isMarkdown, prefix } from "@/lib/paths2";
import { INTERNAL_NODE_FILE_TYPE } from "@/types/FiletreeTypes";

export const prepareNodeDataTransfer = <T extends MetaDataTransfer | DataTransfer>({
  dataTransfer,
  nodes,
  action,
  workspaceId,
}: {
  nodes: TreeNode[];
  dataTransfer?: T;
  action: "copy" | "cut" | "move";
  workspaceId: string;
}) => {
  const dt: T = dataTransfer ?? (new MetaDataTransfer() as T);

  try {
    dt.clearData();
    dt.effectAllowed = "all";
    dt.setData(
      INTERNAL_NODE_FILE_TYPE,
      JSON.stringify(treeNodeDataTransfer({ fileNodes: nodes, action, workspaceId }))
    );
    const paths = [...new Set(nodes)].map((node) => String(node));
    //origin will be included httsp://example.com/path/to/file
    //path needs to be considered on publish ???
    const HTML =
      paths
        .filter(isImage)
        .map((path) => `<img src="${path || ""}" />`)
        .join(" ") +
      paths
        .filter(isMarkdown)
        .map((path) => `<a href="${path || ""}">${capitalizeFirst(prefix(path))}</a>`)
        .join(" ");
    dt.setData("text/html", HTML);
    if (action === "move") {
      //makes for a better path result in editor otherwise the origin is included
      //which is not as fun
      //origin will NOT BE included /path/to/file
      new Set(nodes).forEach((node, i) => {
        dt.setData(`${node.getMimeType()};index=${i}`, node.path);
      });
    }
  } catch (e) {
    console.error("Error preparing node data for drag and drop:", e);
  }
  return dt;
};
