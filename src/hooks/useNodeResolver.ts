import { FileTree } from "@/components/SidebarFileMenu/FileTree/Filetree";
import { ROOT_NODE, TreeDir, TreeFile } from "@/components/SidebarFileMenu/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";

export const useNodeResolver = (
  fileTree: FileTree,
  nodeOrPath: TreeDir | TreeFile | AbsPath,
  defaultNode?: TreeDir | TreeFile
) => {
  if (typeof nodeOrPath === "string") {
    const rn = fileTree.nodeFromPath(nodeOrPath);
    if (!rn) {
      if (defaultNode) return defaultNode;
      console.error(new Error("Invalid path provided to useNodeResolver " + nodeOrPath));
      // console.log(currentWorkspace.getFileTree().root.map)
      return ROOT_NODE;
    }
    return rn;
  }
  return nodeOrPath;
};
