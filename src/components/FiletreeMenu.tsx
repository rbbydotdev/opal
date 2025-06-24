import { Workspace } from "@/Db/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { FileTreeDragPreview } from "@/components/FileTreeDragPreview";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useDragImage } from "@/features/filetree-drag-and-drop/useDragImage";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { TreeDir, TreeDirRoot, TreeFileJType, TreeNode } from "@/lib/FileTree/TreeNode";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { AbsPath, absPath, dirname, encodePath, isImage, isMarkdown, prefix } from "@/lib/paths2";
import clsx from "clsx";
import React, { useCallback } from "react";

export const INTERNAL_FILE_TYPE = "application/x-opal";

export type NodeDataJType = { nodeData: TreeFileJType[] };
export type NodeDataType = { nodeData: TreeNode[] };
async function copyHtmlToClipboard(htmlString: string) {
  try {
    const blob = new Blob([htmlString], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];
    await navigator.clipboard.write(data);
  } catch (err) {
    console.error("Failed to copy HTML to clipboard:", err);
  }
}
export function copyFileNodesToClipboard(fileNodes: TreeNode[]) {
  const htmlString =
    fileNodes
      .map((node) => node.path)
      .filter(isMarkdown)
      .map((path) => `<a href="${encodePath(path || "")}">${capitalizeFirst(prefix(path))}</a>`)
      .join(" ") +
    fileNodes
      .map((node) => node.path)
      .filter(isImage)
      .map((path) => `<img src="${encodePath(path || "")}" />`)
      .join(" ");
  return copyHtmlToClipboard(htmlString);
}
export function useCopyKeydownImages(currentWorkspace: Workspace) {
  const { selectedRange, focused } = useFileTreeMenuCtx();
  function handleCopyKeyDown(origFn: (e: React.KeyboardEvent) => void) {
    return function (e: React.KeyboardEvent, fullPath?: AbsPath) {
      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();

        //TODO: probably reconcile this hyper object handling with prepareNodeDataTransfer
        const allFileNodes = Array.from(new Set([...selectedRange, fullPath, focused ? focused : null]))
          .filter(Boolean)
          .map((entry) => currentWorkspace.disk.fileTree.nodeFromPath(absPath(entry)))
          .filter(Boolean);
        void copyFileNodesToClipboard(allFileNodes);

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

export function allowedMove(targetPath: AbsPath, node: TreeNode) {
  // Prevent moving node to its current directory (no-op)
  if (dirname(node.path) === targetPath) {
    // No-op: trying to move node to its current directory
    return false;
  }
  // Prevent moving node into itself
  if (node.path === targetPath) {
    // Invalid move: trying to move node into itself
    return false;
  }
  if (targetPath.startsWith(node.path + "/")) {
    // Invalid move: trying to move node into its own descendant
    return false;
  }
  return true;
}

// const TrashDir = TreeNode.FromPath(absPath("/.trash"), "dir");

export function FileTreeMenu({
  fileTreeDir,
  renameDirOrFileMultiple,
  depth = 0,
  expand,
  expandForNode,
  expanded,
  filter,
}: // children,
{
  fileTreeDir: TreeDir | TreeDirRoot;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  renameDirOrFileMultiple: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  // children: React.ReactNode;
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  const { setReactDragImage, DragImagePortal } = useDragImage();
  const { highlightDragover, selectedFocused, setFileTreeCtx, id: FileTreeMenuId } = useFileTreeMenuCtx();
  const { addDirFile, duplicateDirFile, trashFiles } = useWorkspaceFileMgmt(currentWorkspace);

  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragDrop({
    currentWorkspace,
    onMoveMultiple: renameDirOrFileMultiple,
    onDragEnter: (path: string, data?: NodeDataJType) => {
      if (!data?.nodeData.some((node) => node.path === path)) {
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
            <MainFileTreeContextMenu
              addFile={() => addDirFile("file", fileNode.closestDir()!)}
              addDir={() => addDirFile("dir", fileNode.closestDir()!)}
              trash={() => trashFiles([...new Set(selectedFocused).add(fileNode.path)])}
              copy={() => copyFileNodesToClipboard([fileNode])} //TODO I DONT THINK I WIRED THIS UP
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
            </MainFileTreeContextMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
