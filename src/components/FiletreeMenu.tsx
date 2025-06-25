import { Workspace } from "@/Db/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { FileTreeContextMenu } from "@/components/FileTreeContextMenus";
import { FileTreeDragPreview } from "@/components/FileTreeDragPreview";
import { useFileTreeMenuCtx } from "@/components/FileTreeProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useDragImage } from "@/features/filetree-drag-and-drop/useDragImage";
import { useFileTreeDragDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { closestTreeDir } from "@/lib/FileTree/Filetree";
import { TreeDir, TreeDirRoot, TreeFileJType, TreeNode } from "@/lib/FileTree/TreeNode";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import { AbsPath, absPath, basename, dirname, encodePath, isImage, isMarkdown, joinPath, prefix } from "@/lib/paths2";
import clsx from "clsx";
import React, { useCallback } from "react";
import { decodePath } from "../lib/paths2";

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
export async function copyFileNodesToClipboard(fileNodes: TreeNode[] | AbsPath[]) {
  const htmlString =
    fileNodes
      .filter(isMarkdown)
      .map((path) => `<a href="${window.location.origin}${path}">${capitalizeFirst(prefix(path))}</a>`)
      .join(" ") +
    fileNodes
      .filter(isImage)
      .map((path) => `<img src="${encodePath(path || "")}" />`)
      .join(" ");
  try {
    const blob = new Blob([htmlString], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];
    await navigator.clipboard.write(data);
  } catch (err) {
    console.error("Failed to copy HTML to clipboard:", err);
  }
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
  const { highlightDragover, selectedFocused, setFileTreeCtx, id: fileTreeId } = useFileTreeMenuCtx();
  const { addDirFile, duplicateDirFile, trashFiles, untrashFiles, removeFiles } =
    useWorkspaceFileMgmt(currentWorkspace);

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
            <FileTreeContextMenu
              fileTreeId={fileTreeId}
              addFile={() => addDirFile("file", fileNode.closestDir()!)}
              addDir={() => addDirFile("dir", fileNode.closestDir()!)}
              trash={() => trashFiles([...new Set(selectedFocused).add(fileNode.path)])}
              copy={() => copyFileNodesToClipboard(selectedFocused)}
              paste={async () => {
                //log clipboard objects/contents to console
                // if (navigator.clipboard) {
                // na
                // navigator.clipboard.
                const items = await navigator.clipboard.read();
                for (const item of items) {
                  if (item.types.includes("text/html")) {
                    const blob = await item.getType("text/html");
                    const htmlString = await blob.text();
                    //parse html string from blob
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlString, "text/html");
                    if (
                      Workspace.parseWorkspacePath(URL.parse(doc.URL)?.pathname ?? "").workspaceId ===
                      currentWorkspace.name
                    ) {
                      console.log("Parsed HTML document:", doc);
                      const selectedNode = currentWorkspace.nodeFromPath(selectedFocused[0]);
                      const destDir = selectedNode ? closestTreeDir(selectedNode).path : absPath("/");
                      const copyNodes: [from: TreeNode, to: AbsPath][] = [];
                      const links = Array.from(doc.querySelectorAll("a")).forEach(async (a) => {
                        const node = currentWorkspace.nodeFromPath(decodePath(URL.parse(a.href)?.pathname ?? ""));
                        if (node) copyNodes.push([node, joinPath(destDir, basename(node))]);
                      });
                      const images = Array.from(doc.querySelectorAll("img")).forEach(async (img) => {
                        const node = currentWorkspace.nodeFromPath(decodePath(URL.parse(img.src)?.pathname ?? ""));
                        if (node) copyNodes.push([node, joinPath(destDir, basename(node))]);
                      });
                      await currentWorkspace.copyMultipleFiles(copyNodes);
                      console.log("Links:", links);
                      console.log("Images:", images);
                    }

                    // await copyHtmlToClipboard(htmlString);
                  }
                }
                // void navigator.clipboard.read().then((items) => {
                //   items.forEach((item) => {
                //     if (item.types.includes("text/html")) {
                //       void item.getType("texthml").then(async (blob) => {
                //         console.log(await blob.text());
                //       });
                //     }
                //   });
                // });
                //
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
