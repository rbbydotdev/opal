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
import { FileTreeContextMenu } from "@/lib/FileTree/FileTreeContextMenu";
import { TreeDir, TreeDirRoot, TreeFile, TreeNode, TreeNodeJType } from "@/lib/FileTree/TreeNode";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { AbsPath, absPath, dirname, encodePath, isImage, isMarkdown, prefix } from "@/lib/paths2";
import clsx from "clsx";
import React, { useCallback } from "react";

export const INTERNAL_FILE_TYPE = "application/x-opal";

export type NodeDataJType = { nodeData: TreeNodeJType[] };
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
}: {
  fileTreeDir: TreeDir | TreeDirRoot | null;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  renameDirOrFileMultiple: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  const { setReactDragImage, DragImagePortal } = useDragImage();
  const { highlightDragover, setEditing, selectedFocused } = useFileTreeMenuCtx();
  const { addDirFile, removeFiles, duplicateDirFile } = useWorkspaceFileMgmt(currentWorkspace);

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
        {depth === 0 && (
          <>
            {/* <div
              onDragOver={(e) => handleDragOver(e, fileTreeDir)}
              onDragStart={handleDragStartWithImg(fileTreeDir)}
              className={clsx("w-full text-sm", {
                ["bg-sidebar-accent"]: fileTreeDir.path === workspaceRoute.path || highlightDragover(fileTreeDir),
              })}
              onDrop={(e) => handleDrop(e, fileTreeDir)}
            >
              <div className="font-bold text-3xs font-mono text-sidebar-foreground border-b border-dashed border-sidebar-foreground">
                <div className="flex items-center gap-2 py-2">
                  <Folders size={12} />/
                </div>
              </div>
            </div> */}
          </>
        )}
        {Object.values(fileTreeDir?.filterOutChildren(filter) ?? {}).map((fileNode) => (
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
              addFile={() => addDirFile("file", fileNode.closestDir()!)}
              addDir={() => addDirFile("dir", fileNode.closestDir()!)}
              removeFile={() => removeFiles([...new Set(selectedFocused).add(fileNode.path)])}
              copyFile={() => copyFileNodesToClipboard([fileNode])} //TODO I DONT THINK I WIRED THIS UP
              duplicate={() => duplicateDirFile(fileNode.type, fileNode)}
              rename={() => setEditing(fileNode.path)}
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
              ) : (
                <SidebarMenuButton asChild>
                  <EditableFile
                    workspaceRoute={workspaceRoute}
                    currentWorkspace={currentWorkspace}
                    depth={depth}
                    fullPath={fileNode.path}
                    treeNode={fileNode as TreeFile}
                    expand={expandForNode}
                    onDragStart={handleDragStartWithImg(fileNode)}
                  />
                </SidebarMenuButton>
              )}
            </FileTreeContextMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}

/*

            <div
              onDragOver={(e) => handleDragOver(e, TrashDirNode)}
              onDragStart={handleDragStartWithImg(TrashDirNode)}
              className={clsx("w-full text-sm", {
                ["bg-sidebar-accent"]: TrashDirNode.path === workspaceRoute.path || highlightDragover(TrashDirNode),
              })}
              onDrop={(e) => handleDrop(e, TrashDirNode)}
            >
                            <div className="font-bold text-3xs font-mono text-sidebar-foreground">
                <Collapsible className="group/collapsible-trash">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <div className="w-full flex items-center text-2xs">
                        <ChevronRight
                          size={14}
                          className={
                            "transition-transform duration-100 group-data-[state=open]/collapsible-trash:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                          }
                        />
                        <div className="flex items-center gap-2 py-2">
                          <Trash2 size={12} /> trash
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <FileTreeMenu
                      expand={expand}
                      expandForNode={expandForNode}
                      fileTreeDir={TrashDirNode as TreeDir}
                      renameDirOrFileMultiple={renameDirOrFileMultiple}
                      depth={1}
                      expanded={expanded}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            */
