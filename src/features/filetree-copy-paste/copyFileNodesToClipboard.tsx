import { INTERNAL_NODE_FILE_TYPE } from "@/components/FiletreeMenu";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { Workspace } from "@/Db/Workspace";
import {
  TreeNodeDataTransferType,
  treeNodeDataTransfer,
} from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath, encodePath, isImage, isMarkdown, prefix } from "@/lib/paths2";
import React from "react";

export function parseCopyNodesPayload(data: string): (TreeNodeDataTransferType & { fileNodes: AbsPath[] }) | null {
  try {
    const parsed = JSON.parse(data) as TreeNodeDataTransferType & { fileNodes: AbsPath[] };
    if (parsed && parsed.workspaceId && Array.isArray(parsed.fileNodes) && parsed.action) {
      return {
        workspaceId: parsed.workspaceId,
        fileNodes: parsed.fileNodes.map((path: string) => absPath(path)),
        action: parsed.action,
      };
    }
  } catch (_error) {
    //swallow
    // console.warn("Failed to parse copy nodes payload");
  }
  return null;
}
export function copyFileNodesToClipboard({
  fileNodes,
  action,
  workspaceId,
}: {
  fileNodes: TreeNode[] | AbsPath[];
  workspaceId: string;
  action: "copy" | "cut";
}) {
  const htmlString =
    fileNodes
      .filter(isMarkdown)
      .map(
        (path) => `<a data-action="copy" href="${window.location.origin}${path}">${capitalizeFirst(prefix(path))}</a>`
      )
      .join(" ") +
    fileNodes
      .filter(isImage)
      .map((path) => `<img data-action="copy" src="${encodePath(path || "")}" />`)
      .join(" ");
  try {
    const data = [
      new ClipboardItem({
        "text/html": htmlString,
        // "text/plain": JSON.stringify(copyNodesPayload({ fileNodes, action, workspaceId })),
        [INTERNAL_NODE_FILE_TYPE]: JSON.stringify(treeNodeDataTransfer({ fileNodes, action, workspaceId })),
      }),
    ];
    return navigator.clipboard.write(data).catch(() => {});
  } catch (err) {
    console.error("Failed to copy HTML to clipboard:", err);
  }
  return Promise.resolve();
}
export function useCopyKeydownImages(currentWorkspace: Workspace) {
  const { selectedRange, focused } = useFileTreeMenuCtx();
  function handleCopyKeyDown(origFn: (e: React.KeyboardEvent) => void) {
    return function (e: React.KeyboardEvent, fullPath?: AbsPath) {
      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();

        //TODO: probably reconcile this hyper object handling with prepareNodeDataTransfer
        const fileNodes = Array.from(new Set([...selectedRange, fullPath, focused ? focused : null]))
          .filter(Boolean)
          .map((entry) => currentWorkspace.disk.fileTree.nodeFromPath(absPath(entry)))
          .filter(Boolean);
        void copyFileNodesToClipboard({ fileNodes, action: "copy", workspaceId: currentWorkspace.name });

        console.debug("copy keydown");
      } else {
        origFn(e);
      }
    };
  }

  return {
    handleCopyKeyDown,
  };
}
