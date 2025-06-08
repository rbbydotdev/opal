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
  encodePath,
  equals,
  isAncestor,
  isImage,
  isMarkdown,
  joinPath,
  prefix,
  reduceLineage,
} from "@/lib/paths2";
import clsx from "clsx";
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

export function useFileTreeDragDrop({
  currentWorkspace,
  onMove,
  onDragEnter,
}: {
  currentWorkspace: Workspace;
  onMove?: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<unknown> | unknown;
  onDragEnter?: (path: string, data?: NodeDataJType) => void;
}) {
  const { selectedRange, focused, setDragOver } = useFileTreeMenuContext();
  const handleDragStart = (event: React.DragEvent, targetNode: TreeNode) => {
    setDragOver(null);
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
    setDragOver(targetNode.path);
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
          return Promise.all(
            reduceLineage(nodeData.map((node) => TreeNode.FromJSON(node))).filter(({ type, path }) => {
              const dropPath = joinPath(targetPath, basename(path));
              if (!equals(path, dropPath) && (type !== "dir" || !isAncestor(dropPath, path))) {
                return onMove?.(currentWorkspace.nodeFromPath(path)!, dropPath, type);
              }
            })
          );
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

export function FileTreeMenu({
  fileTreeDir,
  renameDirOrFile,
  depth = 0,
  expand,
  expandForNode,
  expanded,
}: {
  fileTreeDir: TreeDir;
  renameDirOrFile: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<AbsPath>;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();

  const { dragOver } = useFileTreeMenuContext();
  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragDrop({
    currentWorkspace,
    onMove: renameDirOrFile,
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
      // onCopy={handleCopy}
    >
      {depth === 0 && (
        <div className="w-full text-sm" onDrop={(e) => handleDrop(e, fileTreeDir)}>
          <div className="ml-1 p-1 text-xs"></div>
        </div>
      )}
      {Object.values(fileTreeDir.children).map((file) => (
        <SidebarMenuItem
          key={file.path}
          className={clsx({
            ["bg-sidebar-accent"]:
              equals(file.path, workspaceRoute.path) ||
              (file.isTreeDir() && file.path === (dragOver ? dragOver : null)),
          })}
          onDragOver={(e) => handleDragOver(e, file)}
          onDrop={(e) => handleDrop(e, file)}
          onDragLeave={handleDragLeave}
          onDragEnter={(e) => {
            handleDragEnter(e, file.path);
          }}
        >
          {file.isTreeDir() ? (
            <Collapsible open={expanded[file.path]} onOpenChange={(o) => expand(file.path, o)}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton asChild>
                  <EditableDir
                    // onCopy={(e) => handleCopy(e, file)}
                    workspaceRoute={workspaceRoute}
                    currentWorkspace={currentWorkspace}
                    depth={depth}
                    onDragStart={(e) => handleDragStart(e, file)}
                    treeDir={file}
                    expand={expandForNode}
                    fullPath={file.path}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <FileTreeMenu
                  expand={expand}
                  expandForNode={expandForNode}
                  fileTreeDir={file as TreeDir}
                  renameDirOrFile={renameDirOrFile}
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
                fullPath={file.path}
                treeNode={file as TreeFile}
                expand={expandForNode}
                onDragStart={(e) => handleDragStart(e, file)}
              />
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
