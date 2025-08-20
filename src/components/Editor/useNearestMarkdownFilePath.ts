import { Workspace } from "@/Db/Workspace";
import { prefix } from "@/lib/paths2";
import { useMemo } from "react";

export function useNearestMarkdownFilePath({ currentWorkspace, path }: { currentWorkspace: Workspace; path: string }) {
  return useMemo(() => {
    if (!path) return null;
    const currentNode = currentWorkspace.nodeFromPath(path);
    if (currentNode?.isCssFile()) {
      return (
        currentNode.siblings().find((node) => node.isMarkdownFile() && prefix(node.path) === prefix(path))?.path ||
        currentNode.siblings().find((node) => node.isMarkdownFile())?.path ||
        path
      );
    } else {
      return path;
    }
  }, [currentWorkspace, path]);
}
