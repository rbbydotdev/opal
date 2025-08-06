import { allowedFiletreePathMove } from "@/components/allowedFiletreePathMove";
import { INTERNAL_NODE_FILE_TYPE, NodeDataJType } from "@/components/FiletreeMenu";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { prepareNodeDataTransfer } from "@/components/prepareNodeDataTransfer";
import { Workspace } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, joinPath, reduceLineage } from "@/lib/paths2";
import { useRouter } from "next/navigation";
import React from "react";

import mime from "mime-types";

export function isExternalFileDrop(event: React.DragEvent | DragEvent): boolean {
  return Boolean(
    event.dataTransfer &&
      Array.from(event.dataTransfer.types).some((type) => ["Files", "application/x-moz-file"].includes(type)) &&
      !event.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE)
  );
}

export async function handleDropFilesForNode({
  currentWorkspace,
  files,
  targetNode,
}: {
  currentWorkspace: Workspace;
  files: FileList | [];
  targetNode: TreeNode;
}) {
  const targetDir = targetNode.closestDirPath();
  const fileArray = Array.from(files);
  const imageFiles: File[] = fileArray.filter((file) => file.type.startsWith("image/"));
  const textFiles: File[] = fileArray.filter((file) => file.type.startsWith("text/"));
  const docxFiles: File[] = fileArray.filter(
    (file) => mime.extension(file.type) === "docx" || file.name.endsWith(".docx")
  );
  const promises: Promise<AbsPath[]>[] = [];

  if (docxFiles.length > 0) {
    promises.push(currentWorkspace.uploadMultipleDocx(docxFiles, targetDir));
  }

  if (imageFiles.length > 0) {
    promises.push(currentWorkspace.uploadMultipleImages(imageFiles, targetDir));
  }

  if (textFiles.length > 0) {
    const newFilesData = textFiles.map((file) => [joinPath(targetDir, file.name), file] as [AbsPath, File]);
    promises.push(currentWorkspace.newFiles(newFilesData));
  }

  return (await Promise.all(promises)).flat();
}

export async function handleDropFilesEventForNode({
  currentWorkspace,
  event,
  targetNode,
}: {
  currentWorkspace: Workspace;
  event: React.DragEvent | { dataTransfer: { files: FileList | null } };
  targetNode: TreeNode;
}) {
  if (event instanceof DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (event.dataTransfer?.files) {
    return handleDropFilesForNode({ currentWorkspace, files: event.dataTransfer.files, targetNode });
  } else {
    console.warn("No files found in the drag event dataTransfer.");
    return Promise.resolve([]);
  }
}

export function useHandleDropFilesEventForNodeRedirect({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const router = useRouter();
  // const dropFilesHandler = useHandleDropFilesEventForNode({ currentWorkspace });
  return (event: React.DragEvent, targetNode: TreeNode) => {
    return handleDropFilesEventForNode({ currentWorkspace, event, targetNode }).then(([file]) => {
      if (file) {
        const filePath = currentWorkspace.resolveFileUrl(file);
        router.push(filePath);
      } else {
        console.warn("No file returned from dropFilesHandler.");
      }
      return file;
    });
  };
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

  // const dropFilesHandler = handleDropFilesForNode({ currentWorkspace });
  const { selectedRange, focused, setDragOver, draggingNodes, setDraggingNode, setDraggingNodes } =
    useFileTreeMenuCtx();
  const handleDragStart = (event: React.DragEvent, targetNode: TreeNode) => {
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
        nodes: currentWorkspace.nodesFromPaths(
          selectedRange.slice().concat(targetNode.path, selectedRange, focused ?? [])
        ),
        workspaceId: currentWorkspace.name,
        action: "move",
      });
    } catch (e) {
      console.error(errF`Error preparing node data for drag and drop: ${e}`);
    }
  };

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
    event.preventDefault();
    if (!isExternalFileDrop(event)) {
      return;
    }
    return handleDropFilesForNode({ currentWorkspace, files: event.dataTransfer.files, targetNode });
  };

  const handleDrop = async (event: React.DragEvent, targetNode: TreeNode = currentWorkspace.disk.fileTree.root) => {
    setDragOver(null);
    event.preventDefault();
    event.stopPropagation();
    const targetPath = targetNode.isTreeDir() ? targetNode.path : targetNode.dirname;
    try {
      if (!event.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE)) {
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
    if (event.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE)) {
      const data = JSON.parse(event.dataTransfer.getData(INTERNAL_NODE_FILE_TYPE)) as NodeDataJType;
      onDragEnter?.(path, data);
    } else {
      onDragEnter?.(path);
    }
  };

  return { handleDragStart, handleDragOver, handleDrop, handleDragEnter, handleDragLeave };
}
