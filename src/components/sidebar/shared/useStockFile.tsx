import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuContext";
import { TreeNode } from "@/components/filetree/TreeNode";
import { useTreeExpanderContext } from "@/features/tree-expander/TreeExpanderContext";
import { absPath } from "@/lib/paths2";
import { unwrapContent } from "@/lib/unwrapContent";
import { useWorkspaceFileMgmt } from "@/workspace/useWorkspaceFileMgmt";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";

export function useStockFile() {
  const { currentWorkspace } = useWorkspaceContext();
  const { focused } = useFileTreeMenuCtx();
  const { addNode: addDirFile } = useWorkspaceFileMgmt(currentWorkspace);
  const { expandForNode } = useTreeExpanderContext();

  const addStockFile = async (
    filename: string,
    content: string | Promise<string> | (() => Promise<string>) | (() => string),
    dir?: TreeNode
  ) => {
    const node = addDirFile("file", dir?.path || focused || absPath("/"), filename, () => unwrapContent(content));
    expandForNode(node, true);
  };
  return addStockFile;
}
