import { INTERNAL_FILE_TYPE, NodeDataType } from "@/components/FiletreeMenu";
import { Workspace } from "@/Db/Workspace";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath, encodePath } from "@/lib/paths2";

export const prepareNodeDataTransfer = ({
  dataTransfer,
  selectedRange,
  focused,
  currentWorkspace,
  targetNode,
}: {
  currentWorkspace: Workspace;
  selectedRange: AbsPath[] | string[];
  focused?: AbsPath | null;
  dataTransfer: DataTransfer;
  targetNode?: TreeNode;
}) => {
  const allFileNodes = Array.from(new Set([...selectedRange, targetNode?.path, focused ? focused : null]))
    .filter(Boolean)
    .map((entry) => currentWorkspace.disk.fileTree.nodeFromPath(absPath(entry)))
    .filter(Boolean);

  try {
    const data = JSON.stringify({
      nodeData: allFileNodes,
    } satisfies NodeDataType);
    dataTransfer.clearData();
    dataTransfer.effectAllowed = "all";
    dataTransfer.setData(INTERNAL_FILE_TYPE, data);
    allFileNodes.forEach((node, i) => {
      dataTransfer.setData(`${node.getMimeType()};index=${i}`, encodePath(node.path));
    });
    dataTransfer.setData(
      "text/html",
      allFileNodes.map((node) => `<img src="${encodePath(node.path) || ""}" />`).join(" ")
    );
  } catch (e) {
    console.error("Error preparing node data for drag and drop:", e);
  }
  return dataTransfer;
};
