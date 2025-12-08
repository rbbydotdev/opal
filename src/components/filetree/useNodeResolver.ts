import { FileTree } from "@/components/filetree/Filetree";
import { ROOT_NODE, TreeNode } from "@/components/filetree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export const useNodeResolver = (fileTree: FileTree, nodeOrPath: TreeNode | AbsPath, defaultNode?: TreeNode) => {
  if (typeof nodeOrPath === "string") {
    const rn = fileTree.nodeFromPath(nodeOrPath);
    if (!rn) {
      if (defaultNode) return defaultNode;
      logger.error(new Error("Invalid path provided to useNodeResolver " + nodeOrPath));
      return ROOT_NODE;
    }
    return rn;
  }
  return nodeOrPath;
};
