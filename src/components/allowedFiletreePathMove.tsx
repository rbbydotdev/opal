import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, dirname } from "@/lib/paths2";

export function allowedFiletreePathMove(targetPath: AbsPath, node: TreeNode) {
  // Prevent moving node to its current directory (no-op)
  if (dirname(node.path) === targetPath) {
    // No-op: trying to move node to its current directory
    return false;
  }
  // Prevent moving node into itself
  if (node.path === targetPath) {
    // Invalid move: trying to move node into itself
    return false;
  }
  if (targetPath.startsWith(node.path + "/")) {
    // Invalid move: trying to move node into its own descendant
    return false;
  }
  return true;
}
