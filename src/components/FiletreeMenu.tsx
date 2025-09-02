import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
import { FileTreeDragPreview } from "@/components/FileTreeDragPreview";
import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { flatUniqNodeArgs } from "@/components/flatUniqNodeArgs";
import { MetaDataTransfer } from "@/components/MetaDataTransfer";
import { useFileMenuPaste } from "@/components/SidebarFileMenu/hooks/useFileMenuPaste";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { copyFileNodesToClipboard } from "@/features/filetree-copy-paste/copyFileNodesToClipboard";
import { useDragImage } from "@/features/filetree-drag-and-drop/useDragImage";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { TreeDir, TreeDirRoot, TreeFileJType, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import cn from "clsx";
import React from "react";

export const INTERNAL_NODE_FILE_TYPE = "web application/opal-file-node+json";

export type NodeDataJType = { nodes: TreeFileJType[] };
export type NodeDataType = { nodes: TreeNode[] };

export async function handleFileTreeNodePaste_______DEPRECATED(
  currentWorkspace: Workspace,
  items: ClipboardItems,
  targetNode: TreeNode
) {
  // for (const item of items) {
  //   if (item.types.includes(INTERNAL_NODE_FILE_TYPE)) {
  //     const clipboardText = String(await item.getType(INTERNAL_NODE_FILE_TYPE).then((blob) => blob.text()));
  //     const payload = tryParseCopyNodesPayload(clipboardText);
  //     if (!payload || payload.workspaceId !== currentWorkspace.id) continue;
  //     const { fileNodes, action } = payload;
  //     const copyNodes: [TreeNode, AbsPath][] = fileNodes
  //       .map((path) => [
  //         currentWorkspace.nodeFromPath(String(path))!,
  //         joinPath(targetNode.closestDirPath(), basename(path)),
  //       ])
  //       .filter(([from, to]) => String(from) !== to) as [TreeNode, AbsPath][];
  //     await currentWorkspace.copyMultipleFiles(copyNodes);
  //     if (action === "cut") {
  //       return currentWorkspace.removeMultiple(copyNodes.map(([from]) => from));
  //     }
  //   }
  // }
}

export function useFiletreeMenuContextMenuActions({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const handleFileMenuPaste = useFileMenuPaste({ currentWorkspace });
  const { setFileTreeCtx } = useFileTreeMenuCtx();
  const { addDirFile, duplicateDirFile, trashFiles, untrashFiles, removeFiles } =
    useWorkspaceFileMgmt(currentWorkspace);

  const addFile = (fileNode: TreeNode) => addDirFile("file", fileNode.closestDir()!);
  const addDir = (fileNode: TreeNode) => addDirFile("dir", fileNode.closestDir()!);
  const trash = (...nodes: (AbsPath | TreeNode | AbsPath[] | TreeNode[])[]) => trashFiles(flatUniqNodeArgs(nodes));

  const copy = (fileNodes: TreeNode[]) =>
    copyFileNodesToClipboard({
      fileNodes,
      action: "copy",
      workspaceId: currentWorkspace.id,
    });
  const cut = (fileNodes: TreeNode[]) =>
    copyFileNodesToClipboard({
      fileNodes,
      action: "cut",
      workspaceId: currentWorkspace.id,
    }).then(() => {
      setFileTreeCtx(({ anchorIndex }) => ({
        anchorIndex,
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
      }));
    });
  const paste = async (fileNode: TreeNode) => {
    const data = await MetaDataTransfer.fromClipboard(await navigator.clipboard.read());
    void handleFileMenuPaste({
      targetNode: fileNode,
      data,
    });

    return setFileTreeCtx(({ anchorIndex }) => ({
      anchorIndex,
      editing: null,
      editType: null,
      focused: null,
      virtual: null,
      selectedRange: [],
    }));
  };
  const duplicate = (fileNode: TreeNode) => duplicateDirFile(fileNode.type, fileNode);
  const rename = (fileNode: TreeNode) =>
    setFileTreeCtx(({ anchorIndex }) => ({
      anchorIndex,
      editing: fileNode.path,
      editType: "rename",
      focused: fileNode.path,
      virtual: null,
      selectedRange: [fileNode.path],
    }));
  const untrash = (...fileNodes: (TreeNode | AbsPath | AbsPath[] | TreeNode[])[]) =>
    untrashFiles(flatUniqNodeArgs(fileNodes));
  const remove = (...fileNodes: (TreeNode | AbsPath | AbsPath[] | TreeNode[])[]) =>
    removeFiles(flatUniqNodeArgs(fileNodes));

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
  FileItemContextMenu,
}: {
  fileTreeDir: TreeDir | TreeDirRoot;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  renameDirOrFileMultiple: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  FileItemContextMenu: FileItemContextMenuComponentType;
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  const { setReactDragImage, DragImagePortal } = useDragImage();
  const sidebarMenuRef = React.useRef<HTMLUListElement>(null);
  const { highlightDragover, draggingNodes } = useFileTreeMenuCtx();

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
  const fileNodeChildren = Object.values(fileTreeDir.filterOutChildren(filter));

  return (
    <>
      {DragImagePortal}
      <SidebarMenu
        ref={sidebarMenuRef}
        onDragOver={(e) => handleDragOver(e, fileTreeDir)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, fileTreeDir)}
        onDragEnter={(e) => handleDragEnter(e, "/")}
        className={cn({ "-mt-4": depth === 0 })}
      >
        {fileNodeChildren.map((fileNode) => (
          <SidebarMenuItem
            key={fileNode.path}
            className={cn({
              "ml-[0.577rem] w-[calc(100%-0.7rem)]": depth === 0,
              "bg-sidebar-accent": highlightDragover(fileNode),
            })}
            onDragOver={(e) => handleDragOver(e, fileNode)}
            onDrop={(e) => handleDrop(e, fileNode)}
            onDragLeave={handleDragLeave}
            onDragEnter={(e) => {
              handleDragEnter(e, fileNode.path);
            }}
          >
            <FileItemContextMenu fileNode={fileNode} currentWorkspace={currentWorkspace}>
              {fileNode.isTreeDir() ? (
                <div className="pt-0.5">
                  <Collapsible open={expanded[fileNode.path]} onOpenChange={(o) => expand(fileNode.path, o)}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton asChild>
                        <EditableDir
                          className="my-0.5 pl-3"
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
                        FileItemContextMenu={FileItemContextMenu}
                        expandForNode={expandForNode}
                        fileTreeDir={fileNode as TreeDir}
                        renameDirOrFileMultiple={renameDirOrFileMultiple}
                        depth={depth + 1}
                        expanded={expanded}
                        filter={filter}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ) : fileNode.isTreeFile() ? (
                <div className="pt-0.5">
                  <SidebarMenuButton asChild>
                    <EditableFile
                      className="my-0.5 pl-8"
                      workspaceRoute={workspaceRoute}
                      currentWorkspace={currentWorkspace}
                      depth={depth}
                      fullPath={fileNode.path}
                      treeNode={fileNode}
                      expand={expandForNode}
                      onDragStart={handleDragStartWithImg(fileNode)}
                    />
                  </SidebarMenuButton>
                </div>
              ) : null}
            </FileItemContextMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
