import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { FileTreeContextMenu } from "@/components/FileTreeContextMenus";
import { FileTreeDragPreview } from "@/components/FileTreeDragPreview";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useDragImage } from "@/features/filetree-drag-and-drop/useDragImage";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDir, TreeDirRoot, TreeFileJType, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath, basename, joinPath } from "@/lib/paths2";
import clsx from "clsx";
import React, { useCallback } from "react";
import { tryParseCopyNodesPayload } from "../features/filetree-copy-paste/copyFileNodesToClipboard";

export const INTERNAL_NODE_FILE_TYPE = "web application/opal+json";

export type NodeDataJType = { nodes: TreeFileJType[] };
export type NodeDataType = { nodes: TreeNode[] };

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// function isNodeDataJType(data: any): data is NodeDataJType {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   return data && Array.isArray(data.nodes) && data.nodes.every((node: any) => node.path);
// }

export async function handleFileTreeNodePaste(
  currentWorkspace: Workspace,
  items: ClipboardItems,
  targetNode: TreeNode
) {
  for (const item of items) {
    // if (item.types.includes("text/plain")) {
    if (item.types.includes(INTERNAL_NODE_FILE_TYPE)) {
      // const clipboardText = String(await item.getType("text/plain").then((blob) => blob.text()));
      const clipboardText = String(await item.getType(INTERNAL_NODE_FILE_TYPE).then((blob) => blob.text()));

      const payload = tryParseCopyNodesPayload(clipboardText);
      if (!payload || payload.workspaceId !== currentWorkspace.name) continue;
      const { fileNodes, action } = payload;
      const copyNodes: [TreeNode, AbsPath][] = fileNodes
        .map((path) => [
          currentWorkspace.nodeFromPath(String(path))!,
          joinPath(targetNode.closestDirPath(), basename(path)),
        ])
        .filter(([from, to]) => String(from) !== to) as [TreeNode, AbsPath][];
      await currentWorkspace.copyMultipleFiles(copyNodes);
      if (action === "cut") {
        return currentWorkspace.removeMultiple(copyNodes.map(([from]) => from));
      }
    }
  }
}

export function FileTreeMenu({
  fileTreeDir,
  renameDirOrFileMultiple,
  depth = 0,
  expand,
  expandForNode,
  expanded,
  filter,
}: {
  fileTreeDir: TreeDir | TreeDirRoot;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  renameDirOrFileMultiple: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  const { setReactDragImage, DragImagePortal } = useDragImage();
  const sidebarMenuRef = React.useRef<HTMLUListElement>(null);
  const { highlightDragover, selectedFocused, setFileTreeCtx, id: fileTreeId, draggingNodes } = useFileTreeMenuCtx();
  const { addDirFile, duplicateDirFile, trashFiles, untrashFiles, removeFiles } =
    useWorkspaceFileMgmt(currentWorkspace);

  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragDrop({
    currentWorkspace,
    onMoveMultiple: renameDirOrFileMultiple,
    onDragEnter: (path: string, data?: NodeDataJType) => {
      if (!data?.nodes?.some((node) => node.path === path) || draggingNodes.some((node) => node.path === path)) {
        expand(path, true);
      }
    },
  });
  const handleDragStartWithImg = useCallback(
    (node: TreeNode) => (e: React.DragEvent) => {
      handleDragStart(e, node);
      setReactDragImage(e, <FileTreeDragPreview />);
    },
    [handleDragStart, setReactDragImage]
  );

  return (
    <>
      {DragImagePortal}
      <SidebarMenu
        ref={sidebarMenuRef}
        onDragOver={(e) => handleDragOver(e, fileTreeDir)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, fileTreeDir)}
        onDragEnter={(e) => handleDragEnter(e, "/")}
        className={clsx({ "": depth === 0 })}
      >
        {Object.values(fileTreeDir.filterOutChildren(filter)).map((fileNode) => (
          <SidebarMenuItem
            key={fileNode.path}
            className={clsx({
              ["bg-sidebar-accent"]: fileNode.path === workspaceRoute.path || highlightDragover(fileNode),
            })}
            onDragOver={(e) => handleDragOver(e, fileNode)}
            onDrop={(e) => handleDrop(e, fileNode)}
            onDragLeave={handleDragLeave}
            onDragEnter={(e) => {
              handleDragEnter(e, fileNode.path);
            }}
          >
            <FileTreeContextMenu
              fileTreeId={fileTreeId}
              addFile={() => addDirFile("file", fileNode.closestDir()!)}
              addDir={() => addDirFile("dir", fileNode.closestDir()!)}
              trash={() => trashFiles([...new Set(selectedFocused).add(fileNode.path)])}
              copy={() =>
                copyFileNodesToClipboard({
                  fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
                  action: "copy",
                  workspaceId: currentWorkspace.name,
                })
              }
              cut={() =>
                copyFileNodesToClipboard({
                  fileNodes: currentWorkspace.nodesFromPaths(selectedFocused),
                  action: "cut",
                  workspaceId: currentWorkspace.name,
                }).then(() => {
                  setFileTreeCtx({
                    editing: null,
                    editType: null,
                    focused: null,
                    virtual: null,
                    selectedRange: [],
                  });
                })
              }
              paste={async () => {
                await handleFileTreeNodePaste(
                  currentWorkspace,
                  await navigator.clipboard.read(),
                  currentWorkspace.tryNodeFromPath(selectedFocused[0])
                );
                return setFileTreeCtx({
                  editing: null,
                  editType: null,
                  focused: null,
                  virtual: null,
                  selectedRange: [],
                });
              }}
              duplicate={() => duplicateDirFile(fileNode.type, fileNode)}
              rename={() =>
                setFileTreeCtx({
                  editing: fileNode.path,
                  editType: "rename",
                  focused: fileNode.path,
                  virtual: null,
                  selectedRange: [fileNode.path],
                })
              }
              untrash={() => untrashFiles([...new Set(selectedFocused).add(fileNode.path)])}
              remove={() => removeFiles([...new Set(selectedFocused).add(fileNode.path)])}
            >
              {fileNode.isTreeDir() ? (
                <Collapsible open={expanded[fileNode.path]} onOpenChange={(o) => expand(fileNode.path, o)}>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton asChild>
                      <EditableDir
                        workspaceRoute={workspaceRoute}
                        currentWorkspace={currentWorkspace}
                        depth={depth}
                        onDragStart={handleDragStartWithImg(fileNode)}
                        treeDir={fileNode}
                        expand={expandForNode}
                        fullPath={fileNode.path}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <FileTreeMenu
                      expand={expand}
                      expandForNode={expandForNode}
                      fileTreeDir={fileNode as TreeDir}
                      renameDirOrFileMultiple={renameDirOrFileMultiple}
                      depth={depth + 1}
                      expanded={expanded}
                      filter={filter}
                    />
                  </CollapsibleContent>
                </Collapsible>
              ) : fileNode.isTreeFile() ? (
                <SidebarMenuButton asChild>
                  <EditableFile
                    workspaceRoute={workspaceRoute}
                    currentWorkspace={currentWorkspace}
                    depth={depth}
                    fullPath={fileNode.path}
                    treeNode={fileNode}
                    expand={expandForNode}
                    onDragStart={handleDragStartWithImg(fileNode)}
                  />
                </SidebarMenuButton>
              ) : null}
            </FileTreeContextMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
