import { Workspace } from "@/Db/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { useFileTreeMenuContext } from "@/components/FileTreeProvider";
import { prepareNodeDataTransfer } from "@/components/prepareNodeDataTransfer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorPopupControl } from "@/components/ui/error-popup";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { TreeDir, TreeFile, TreeNode, TreeNodeJType } from "@/lib/FileTree/TreeNode";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { BadRequestError, errF, isError } from "@/lib/errors";
import {
  AbsPath,
  absPath,
  basename,
  dirname,
  encodePath,
  isImage,
  isMarkdown,
  joinPath,
  prefix,
  reduceLineage,
} from "@/lib/paths2";
import clsx from "clsx";
import { Folders, Trash2 } from "lucide-react";
import React from "react";

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
export function useCopyKeydownImages(currentWorkspace: Workspace) {
  const { selectedRange, focused } = useFileTreeMenuContext();
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
        void copyHtmlToClipboard(
          allFileNodes
            .map((node) => node.path)
            .filter(isMarkdown)
            //TODO: BROKEN, mdx-editor does not include href
            .map((path) => `<a href="${encodePath(path || "")}">${capitalizeFirst(prefix(path))}</a>`)
            .join(" ") +
            allFileNodes
              .map((node) => node.path)
              .filter(isImage)
              .map((path) => `<img src="${encodePath(path || "")}" />`)
              .join(" ")
        );

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
  const { selectedRange, focused, setDragOver, setDraggingNode: setDragNode } = useFileTreeMenuContext();
  const handleDragStart = (event: React.DragEvent, targetNode: TreeNode) => {
    setDragOver(null);
    setDragNode(targetNode);
    window.addEventListener(
      "dragend",
      () => {
        setDragNode(null);
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
    const targetPath = targetNode.isTreeDir() ? targetNode.path : targetNode.dirname;
    const { files } = event.dataTransfer;
    for (const file of files) {
      try {
        await currentWorkspace.dropImageFile(file, targetPath);
      } catch (e) {
        if (isError(e, BadRequestError)) {
          ErrorPopupControl.show({
            title: "Not a valid image",
            description: "Please upload a valid image file (png,gif,webp,jpg)",
          });
        }
        console.error("Error dropping file:", e);
      }
    }
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
        const { nodeData } = JSON.parse(event.dataTransfer.getData(INTERNAL_FILE_TYPE)) as NodeDataJType;

        if (nodeData && nodeData.length) {
          const moveNodes = reduceLineage(nodeData.map((node) => TreeNode.FromJSON(node)))
            .filter((node) => allowedMove(targetPath, node))
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

const TrashDir = TreeNode.FromPath(absPath("/.trash"), "dir");

export function FileTreeMenu({
  fileTreeDir,
  renameDirOrFileMultiple,
  depth = 0,
  expand,
  expandForNode,
  expanded,
  showHidden,
}: {
  fileTreeDir: TreeDir;

  depth?: number;
  expand: (path: string, value: boolean) => void;
  renameDirOrFileMultiple: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  showHidden?: boolean;
}) {
  showHidden = showHidden ?? true;
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();

  const { highlightDragover } = useFileTreeMenuContext();
  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragDrop({
    currentWorkspace,
    onMoveMultiple: renameDirOrFileMultiple,
    onDragEnter: (path: string, data?: NodeDataJType) => {
      if (!data?.nodeData.some((node) => node.path === path)) {
        expand(path, true);
      }
    },
  });

  return (
    <SidebarMenu
      onDragOver={(e) => handleDragOver(e, fileTreeDir)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, fileTreeDir)}
      onDragEnter={(e) => handleDragEnter(e, "/")}
      className={clsx({ "": depth === 0 })}
    >
      {depth === 0 && (
        <>
          <div
            onDragOver={(e) => handleDragOver(e, TrashDir)}
            onDragStart={(e) => handleDragStart(e, TrashDir)}
            className={clsx("w-full text-sm", {
              ["bg-sidebar-accent"]: TrashDir.path === workspaceRoute.path || highlightDragover(TrashDir),
            })}
            onDrop={(e) => handleDrop(e, TrashDir)}
          >
            <div className="font-bold text-3xs font-mono text-sidebar-foreground">
              <div className="flex items-center gap-2 py-2">
                <Trash2 size={12} /> Trash
              </div>
            </div>
          </div>
          <div
            onDragOver={(e) => handleDragOver(e, fileTreeDir)}
            onDragStart={(e) => handleDragStart(e, fileTreeDir)}
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
          </div>
        </>
      )}
      {Object.values(fileTreeDir.children)
        .filter((fileNode) => showHidden || !fileNode.isHidden())
        .map((fileNode) => (
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
            {fileNode.isTreeDir() ? (
              <Collapsible open={expanded[fileNode.path]} onOpenChange={(o) => expand(fileNode.path, o)}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton asChild>
                    <EditableDir
                      workspaceRoute={workspaceRoute}
                      currentWorkspace={currentWorkspace}
                      depth={depth}
                      onDragStart={(e) => handleDragStart(e, fileNode)}
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
                  onDragStart={(e) => handleDragStart(e, fileNode)}
                />
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}
