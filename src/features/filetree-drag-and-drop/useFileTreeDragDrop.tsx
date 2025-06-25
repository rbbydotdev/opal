import { allowedFiletreePathMove } from "@/components/allowedFiletreePathMove";
import { INTERNAL_FILE_TYPE, NodeDataJType } from "@/components/FiletreeMenu";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { prepareNodeDataTransfer } from "@/components/prepareNodeDataTransfer";
import { Workspace } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, joinPath, reduceLineage } from "@/lib/paths2";
import React, { useCallback } from "react";

export function isExternalFileDrop(event: React.DragEvent) {
  return (
    event.dataTransfer &&
    event.dataTransfer.files &&
    event.dataTransfer.files.length > 0 &&
    !event.dataTransfer.getData(INTERNAL_FILE_TYPE)
  );
}

export function useExternalDrop({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const externalDrop = async (event: React.DragEvent, targetNode: TreeNode) => {
    if (!isExternalFileDrop(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { files } = event.dataTransfer;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length > 0) {
      return currentWorkspace.uploadMultipleImages(images, targetNode.closestDirPath());
    }
  };
  return { externalDrop };
}

export function useFileTreeDragDrop({
  currentWorkspace,
  onMoveMultiple,
  onDragEnter,
}: {
  currentWorkspace: Workspace;
  onMoveMultiple?: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  onDragEnter?: (path: string, data?: NodeDataJType) => void;
}) {
  function dropPath(targetPath: AbsPath, node: TreeNode) {
    return joinPath(targetPath, basename(node.path));
  }
  function dropNode(targetPath: AbsPath, node: TreeNode) {
    return TreeNode.FromPath(dropPath(targetPath, node), node.type);
  }

  const { externalDrop } = useExternalDrop({ currentWorkspace });

  const { selectedRange, focused, setDragOver, draggingNodes, setDraggingNode, setDraggingNodes } =
    useFileTreeMenuCtx();
  const handleDragStart = useCallback(
    (event: React.DragEvent, targetNode: TreeNode) => {
      event.stopPropagation();
      setDragOver(null);
      setDraggingNode(targetNode);
      setDraggingNodes(selectedRange.map((path) => currentWorkspace.nodeFromPath(path)).filter(Boolean));
      window.addEventListener(
        "dragend",
        () => {
          setDraggingNode(null);
          setDraggingNodes([]);
        },
        { once: true }
      );
      try {
        prepareNodeDataTransfer({
          dataTransfer: event.dataTransfer,
          selectedRange,
          focused,
          currentWorkspace,
          targetNode,
        });
      } catch (e) {
        console.error(errF`Error preparing node data for drag and drop: ${e}`);
      }
    },
    [currentWorkspace, focused, selectedRange, setDragOver, setDraggingNode, setDraggingNodes]
  );

  const handleDragOver = (event: React.DragEvent, targetNode: TreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOver(targetNode);
    return false;
  };
  const handleDragLeave = (event: React.DragEvent) => {
    setDragOver(null);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleExternalDrop = async (event: React.DragEvent, targetNode: TreeNode) => {
    return externalDrop(event, targetNode);
  };

  const handleDrop = async (event: React.DragEvent, targetNode: TreeNode = currentWorkspace.disk.fileTree.root) => {
    setDragOver(null);
    event.preventDefault();
    event.stopPropagation();
    const targetPath = targetNode.isTreeDir() ? targetNode.path : targetNode.dirname;
    try {
      if (!event.dataTransfer.getData(INTERNAL_FILE_TYPE)) {
        await handleExternalDrop(event, targetNode);
      } else {
        if (draggingNodes.length) {
          //should reduce lineage go inside the lower level moveMultiple fn !??!
          const moveNodes = reduceLineage(draggingNodes)
            .filter((node) => allowedFiletreePathMove(targetPath, node))
            .map((node) => [node, dropNode(targetPath, node)]) as [TreeNode, TreeNode][];

          await onMoveMultiple?.(moveNodes);
        }
      }
    } catch (e) {
      console.error("Error parsing dragged data:", e);
      return;
    }
  };

  const handleDragEnter = (event: React.DragEvent, path: string) => {
    event.preventDefault();
    if (event.dataTransfer.getData(INTERNAL_FILE_TYPE)) {
      const data = JSON.parse(event.dataTransfer.getData(INTERNAL_FILE_TYPE)) as NodeDataJType;
      onDragEnter?.(path, data);
    } else {
      onDragEnter?.(path);
    }
  };

  return { handleDragStart, handleDragOver, handleDrop, handleDragEnter, handleDragLeave };
}
