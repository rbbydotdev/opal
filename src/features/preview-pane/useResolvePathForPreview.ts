import { Workspace } from "@/Db/Workspace";
import { AbsPath, prefix } from "@/lib/paths2";
import { useMemo } from "react";

export function useResolvePathForPreview({
  path,
  currentWorkspace,
}: {
  path: AbsPath | null;
  currentWorkspace: Workspace;
}) {
  const previewNode = useMemo(() => {
    if (!path) return null;
    const currentNode = currentWorkspace.nodeFromPath(path);
    // Prioritize mustache files first
    if (currentNode?.isMustache()) return currentNode;
    if (currentNode?.isMarkdownFile()) return currentNode;
    if (currentNode?.isEjsFile()) return currentNode;
    if (currentNode?.isHtmlFile()) return currentNode;
    if (currentNode?.isImageFile()) return null;
    return (
      currentNode?.siblings().find((node) => node.isMarkdownFile() && prefix(node.path) === prefix(path)) ||
      currentNode?.siblings().find((node) => node.isMarkdownFile())
      // currentNode
    );
  }, [currentWorkspace, path]);
  return previewNode;
}
