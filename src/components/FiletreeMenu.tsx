import { Workspace } from "@/Db/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorPopupControl } from "@/components/ui/error-popup";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { withCurrentWorkspace, WorkspaceContextType, WorkspaceRouteType } from "@/context";
import { TreeDir, TreeFile, TreeNode, TreeNodeJType } from "@/lib/FileTree/TreeNode";
import { BadRequestError, isError } from "@/lib/errors";
import { absPath2, AbsolutePath2, reduceLineage } from "@/lib/paths2";
import clsx from "clsx";
import React from "react";
import { isAncestor, toString, joinAbsolutePath, basename, equals, encodePath, getPathMimeType } from "@/lib/paths2";

export const FileTreeMenu = withCurrentWorkspace(FileTreeContainer);

// const ACCEPTED_FILE_TYPES = [
//   "text/plain",
//   "text/markdown",
//   "text/x-markdown",
//   "text/x-markdown",
//   "image/jpeg",
//   "image/png",
//   "image/webp",
//   "image/gif",
//   "image/svg",
// ];

// const isAcceptedFileType = (file: File) => ACCEPTED_FILE_TYPES.includes(file.type);

export function FileTreeContainer({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  ...props
}: WorkspaceContextType & React.ComponentProps<typeof FileTreeMenuInternal>) {
  return (
    <FileTreeMenuInternal
      {...props}
      fileTreeDir={fileTreeDir}
      currentWorkspace={currentWorkspace}
      workspaceRoute={workspaceRoute}
    />
  );
}

const INTERNAL_FILE_TYPE = "application/x-opal";

export type DragStartJType = { dragStart: TreeNodeJType[] };
export type DragStartType = { dragStart: TreeNode[] };
export function useFileTreeDragAndDrop({
  currentWorkspace,
  onMove,
  onDragEnter,
}: {
  currentWorkspace: Workspace;
  onMove?: (oldNode: TreeNode, newPath: AbsolutePath2, type: "dir" | "file") => Promise<unknown> | unknown;
  onDragEnter?: (path: string, data?: DragStartJType) => void;
}) {
  const { selectedRange, focused, setDragOver } = useFileTreeMenuContext();
  //on drag start cancel focus on key up

  const handleDragStart = (event: React.DragEvent, targetNode: TreeNode) => {
    setDragOver(null);
    // Create a set of unique file paths from the selected range, the current file, and the focused file
    const allFiles = Array.from(new Set([...selectedRange, toString(targetNode.path), focused ? toString(focused) : null]))
      .filter(Boolean)
      .map((entry) => absPath2(entry!));

    // Prepare the data for the internal file type
    const data = JSON.stringify({
      dragStart: Array.from(new Set([...selectedRange, toString(targetNode.path), focused ? toString(focused) : ""]))
        .map((path) => (path ? currentWorkspace.disk.fileTree.nodeFromPath(path) : null))
        .filter(Boolean),
    } satisfies DragStartType);

    // Set the effect allowed for the drag operation
    event.dataTransfer.effectAllowed = "all";

    //log event.dataTransfer items
    event.dataTransfer.clearData();

    // Set the internal file type data
    event.dataTransfer.setData(INTERNAL_FILE_TYPE, data);

    event.dataTransfer.setData("text/html", allFiles.map((url) => `<a href="${encodePath(url)}">${toString(url)}</a>`).join("\n"));

    allFiles.filter(Boolean).forEach((fpath, i) => {
      //using semi-colon to play nice with possible mimeType collision (hackish)

      // event.dataTransfer.setData(`${fpath.getMimeType()};index=${i}`, encodePath(fpath));
      //TODO: Not using url safe?
      event.dataTransfer.setData(`${getPathMimeType(fpath)};index=${i}`, toString(fpath));
    });
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
    const targetPath = targetNode.type === "dir" ? targetNode.path : targetNode.dirname;
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
    const targetPath = targetNode.type === "dir" ? targetNode.path : targetNode.dirname;
    try {
      if (!event.dataTransfer.getData(INTERNAL_FILE_TYPE)) {
        await handleExternalDrop(event, targetNode);
      } else {
        const { dragStart } = JSON.parse(event.dataTransfer.getData(INTERNAL_FILE_TYPE)) as DragStartJType;

        if (dragStart && dragStart.length) {
          const dragNodes = reduceLineage(dragStart.map((node) => TreeNode.fromJSON(node)));
          return Promise.all(
            dragNodes.filter(({ type: draggedType, path: draggedPath }) => {
              const dropPath = joinAbsolutePath(targetPath, basename(draggedPath));
              if (draggedType !== "dir" || !isAncestor(dropPath, toString(draggedPath))) {
                if (!equals(draggedPath, dropPath)) {
                  return onMove?.(currentWorkspace.nodeFromPath(draggedPath)!, dropPath, draggedType);
                }
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
      const data = JSON.parse(event.dataTransfer.getData(INTERNAL_FILE_TYPE)) as DragStartJType;
      onDragEnter?.(path, data);
    } else {
      onDragEnter?.(path);
    }
  };
  return { handleDragStart, handleDragOver, handleDrop, handleDragEnter, handleDragLeave };
}

function FileTreeMenuInternal({
  fileTreeDir,
  renameDirOrFile,
  depth = 0,
  expand,
  expandForNode,
  currentWorkspace,
  expanded,
  workspaceRoute,
}: {
  fileTreeDir: TreeDir;
  renameDirOrFile: (oldNode: TreeNode, newPath: AbsolutePath2, type: "dir" | "file") => Promise<AbsolutePath2>;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  currentWorkspace: Workspace;
  expanded: { [path: string]: boolean };
  workspaceRoute: WorkspaceRouteType;
}) {
  // const { resetSelects } = useFileTreeMenuContext();
  //TODO: this needs moved to top
  // //This must be done, as old selects can stick around after a remote change or local change / move / rename
  // useEffect(() => {
  //   return currentWorkspace.watchDisk(resetSelects, { initialTrigger: false });
  // }, [currentWorkspace, resetSelects]);

  const { dragOver } = useFileTreeMenuContext();
  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragAndDrop({
    currentWorkspace,
    onMove: renameDirOrFile,
    onDragEnter: (path: string, data?: DragStartJType) => {
      if (!data?.dragStart.some((node) => node.path === path)) {
        expand(path, true);
      }
    }, //if the path is another directory, expand it
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
        <div className="w-full text-sm" onDrop={(e) => handleDrop(e, fileTreeDir)}>
          <div className="ml-1 p-1 text-xs"></div>
        </div>
      )}
      {Object.values(fileTreeDir.children).map((file) => (
        <SidebarMenuItem
          key={toString(file.path)}
          className={clsx({
            ["bg-sidebar-accent"]:
              equals(file.path, workspaceRoute.path) || (file.type === "dir" && toString(file.path) === (dragOver ? toString(dragOver) : null)),
          })}
          onDragOver={(e) => handleDragOver(e, file)}
          onDrop={(e) => handleDrop(e, file)}
          onDragLeave={handleDragLeave}
          onDragEnter={(e) => {
            handleDragEnter(e, toString(file.path));
          }}
        >
          {file.isTreeDir() ? (
            <Collapsible open={expanded[toString(file.path)]} onOpenChange={(o) => expand(toString(file.path), o)}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton asChild>
                  <EditableDir
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
                <FileTreeMenuInternal
                  expand={expand}
                  expandForNode={expandForNode}
                  fileTreeDir={file as TreeDir}
                  renameDirOrFile={renameDirOrFile}
                  currentWorkspace={currentWorkspace}
                  workspaceRoute={workspaceRoute}
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
                treeFile={file as TreeFile}
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
