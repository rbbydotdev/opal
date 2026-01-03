import { TreeNode } from "@/components/filetree/TreeNode";
import { AbsPath, prefix } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useEffect, useMemo, useState } from "react";

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
    // Prioritize template files first
    if (currentNode?.isMustache()) return currentNode;
    if (currentNode?.isEjsFile()) return currentNode;
    if (currentNode?.isNunchucksFile()) return currentNode;
    if (currentNode?.isLiquidFile()) return currentNode;
    if (currentNode?.isMarkdownFile()) return currentNode;
    if (currentNode?.isHtmlFile()) return currentNode;
    if (currentNode?.isImageFile()) return null;
    return (
      currentNode?.siblings().find((node) => node.isMarkdownFile() && prefix(node.path) === prefix(path)) ||
      currentNode?.siblings().find((node) => node.isMarkdownFile()) ||
      null
    );
  }, [currentWorkspace, path]);
  const [preferPreviewNode, setPreferPreviewNode] = useState<TreeNode | null>(null);
  const reset = () => {
    setPreferPreviewNode(null);
  };
  useEffect(() => {
    if (preferPreviewNode !== previewNode) setPreferPreviewNode(previewNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return {
    pathPreviewNode: previewNode,
    setPreviewNode: setPreferPreviewNode,
    choicePreviewNode: preferPreviewNode || previewNode,
    reset,
  };
}
