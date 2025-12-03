import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, prefix } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useCallback, useEffect, useState } from "react";

export function useResolvePathForPreview({
  path,
  currentWorkspace,
}: {
  path: AbsPath | null;
  currentWorkspace: Workspace;
}) {
  const getPreviewNode = useCallback(() => {
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
      currentNode?.siblings().find((node) => node.isMarkdownFile()) ||
      null
    );
  }, [currentWorkspace, path]);
  const [previewNode, setPreviewNode] = useState<TreeNode | null>(getPreviewNode);

  useEffect(() => {
    const resolvedNode = getPreviewNode();
    setPreviewNode(resolvedNode!);
  }, [currentWorkspace, getPreviewNode, path]);

  return { setPreviewNode, previewNode };
}
