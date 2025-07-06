import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { FileTreeContextMenu } from "@/components/FileTreeContextMenus";
import { FileTreeDragPreview } from "@/components/FileTreeDragPreview";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/SidebarFileMenu/useFileMenuPaste";
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
import React from "react";
import { tryParseCopyNodesPayload } from "../features/filetree-copy-paste/copyFileNodesToClipboard";

export const INTERNAL_NODE_FILE_TYPE = "web application/opal-file-node+json";

export type NodeDataJType = { nodes: TreeFileJType[] };
export type NodeDataType = { nodes: TreeNode[] };

export async function handleFileTreeNodePaste(
  currentWorkspace: Workspace,
  items: ClipboardItems,
  targetNode: TreeNode
) {
  for (const item of items) {
    if (item.types.includes(INTERNAL_NODE_FILE_TYPE)) {
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

function useFiletreeMenuContextMenuActions({
  currentWorkspace,
}: // fileNode,
{
  currentWorkspace: Workspace;
  // fileNode: TreeDir | TreeFile;
}) {
  const handleFileMenuPaste = useFileMenuPaste({ currentWorkspace });
  const { setFileTreeCtx } = useFileTreeMenuCtx();
  const { addDirFile, duplicateDirFile, trashFiles, untrashFiles, removeFiles } =
    useWorkspaceFileMgmt(currentWorkspace);

  const addFile = (fileNode: TreeNode) => addDirFile("file", fileNode.closestDir()!);
  const addDir = (fileNode: TreeNode) => addDirFile("dir", fileNode.closestDir()!);
  const trash = (...nodes: (AbsPath | TreeNode | AbsPath[] | TreeNode[])[]) =>
    trashFiles([...new Set(nodes.flatMap((node) => String(node) as AbsPath))]);
  const copy = (fileNodes: TreeNode[]) =>
    copyFileNodesToClipboard({
      fileNodes,
      action: "copy",
      workspaceId: currentWorkspace.name,
    });
  const cut = (fileNodes: TreeNode[]) =>
    copyFileNodesToClipboard({
      fileNodes,
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
    });
  const paste = async (fileNode: TreeNode) => {
    const data = await MetaDataTransfer.fromClipboard(await navigator.clipboard.read());
    void handleFileMenuPaste({
      targetNode: fileNode,
      data,
    });

    return setFileTreeCtx({
      editing: null,
      editType: null,
      focused: null,
      virtual: null,
      selectedRange: [],
    });
  };
  const duplicate = (fileNode: TreeNode) => duplicateDirFile(fileNode.type, fileNode);
  const rename = (fileNode: TreeNode) =>
    setFileTreeCtx({
      editing: fileNode.path,
      editType: "rename",
      focused: fileNode.path,
      virtual: null,
      selectedRange: [fileNode.path],
    });
  const untrash = (...fileNodes: (TreeNode | AbsPath | AbsPath[] | TreeNode[])[]) => untrashFiles(...fileNodes);
  const remove = (...fileNodes: (TreeNode | AbsPath | AbsPath[] | TreeNode[])[]) => removeFiles(...fileNodes);

  return {
    addFile,
    addDir,
    trash,
    copy,
    cut,
    paste,
    duplicate,
    rename,
    untrash,
    remove,
  };
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
  const { highlightDragover, selectedFocused, id: fileTreeId, draggingNodes } = useFileTreeMenuCtx();

  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragDrop({
    currentWorkspace,
    onMoveMultiple: renameDirOrFileMultiple,
    onDragEnter: (path: string, data?: NodeDataJType) => {
      if (!data?.nodes?.some((node) => node.path === path) || draggingNodes.some((node) => node.path === path)) {
        expand(path, true);
      }
    },
  });
  const handleDragStartWithImg = (node: TreeNode) => (e: React.DragEvent) => {
    handleDragStart(e, node);
    setReactDragImage(e, <FileTreeDragPreview />);
  };

  const { addFile, addDir, trash, copy, cut, paste, duplicate, rename, untrash, remove } =
    useFiletreeMenuContextMenuActions({ currentWorkspace });

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
              addFile={() => addFile(fileNode)}
              addDir={() => addDir(fileNode)}
              trash={() => trash(fileNode, selectedFocused)}
              copy={() => copy(currentWorkspace.nodesFromPaths(selectedFocused))}
              cut={() => cut(currentWorkspace.nodesFromPaths(selectedFocused))}
              paste={() => paste(fileNode)}
              duplicate={() => duplicate(fileNode)}
              rename={() => rename(fileNode)}
              untrash={() => untrash(selectedFocused, fileNode)}
              remove={() => remove(selectedFocused, fileNode)}
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
