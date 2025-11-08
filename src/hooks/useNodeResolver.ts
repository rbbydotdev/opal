import { Workspace } from "@/data/Workspace";
import { TreeDir, TreeFile } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export const useNodeResolver = (
  currentWorkspace: Workspace,
  nodeOrPath: TreeDir | TreeFile | AbsPath,
  defaultNode?: TreeDir | TreeFile
) => {
  if (typeof nodeOrPath === "string") {
    const rn = currentWorkspace.nodeFromPath(nodeOrPath);
    if (!rn) {
      if (defaultNode) return defaultNode;
      throw new Error("Invalid path provided to useNodeResolver");
    }
    return rn;
  }
  return nodeOrPath;
};
