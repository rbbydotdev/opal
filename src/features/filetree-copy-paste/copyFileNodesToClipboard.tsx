import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { prepareNodeDataTransfer } from "@/components/prepareNodeDataTransfer";
import { Workspace } from "@/data/Workspace";
import {
  TreeNodeDataTransferJType,
  TreeNodeDataTransferType,
} from "@/features/filetree-copy-paste/TreeNodeDataTransferType";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, absPath } from "@/lib/paths2";
import React from "react";

function tryParseCopyNodesPayload(data: string): TreeNodeDataTransferJType | null {
  try {
    const parsed = JSON.parse(data) as TreeNodeDataTransferType & { fileNodes: AbsPath[] };
    if (parsed && parsed.workspaceId && Array.isArray(parsed.fileNodes) && parsed.action) {
      return {
        workspaceId: parsed.workspaceId,
        fileNodes: parsed.fileNodes.map((path: string) => absPath(path)),
        action: parsed.action,
      };
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }
  return null;
}

// prepareNodeDataTransfer
export async function copyFileNodesToClipboard({
  fileNodes,
  action,
  workspaceId,
}: {
  fileNodes: TreeNode[];
  workspaceId: string;
  action: "copy" | "cut";
}) {
  try {
    const metaDataTransfer = prepareNodeDataTransfer({
      dataTransfer: new MetaDataTransfer(),
      nodes: fileNodes,
      workspaceId,
      action,
    });
    return navigator.clipboard.write([await metaDataTransfer.toClipboardItem()]);
  } catch (err) {
    console.error("Failed to copy HTML to clipboard:", err);
  }
  return Promise.resolve();
}
function useCopyKeydownImages(currentWorkspace: Workspace) {
  const { selectedRange, focused } = useFileTreeMenuCtx();
  function handleCopyKeyDown(origFn: (e: React.KeyboardEvent) => void) {
    return function (e: React.KeyboardEvent, fullPath?: AbsPath) {
      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();

        //TODO: probably reconcile this hyper object handling with prepareNodeDataTransfer
        const fileNodes = Array.from(new Set([...selectedRange, fullPath, focused ? focused : null]))
          .filter(Boolean)
          .map((entry) => currentWorkspace.getDisk().fileTree.nodeFromPath(absPath(entry)))
          .filter(Boolean);
        void copyFileNodesToClipboard({ fileNodes, action: "copy", workspaceId: currentWorkspace.id });

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
