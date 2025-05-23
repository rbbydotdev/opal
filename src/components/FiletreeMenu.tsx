import { Workspace } from "@/Db/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { withCurrentWorkspace, WorkspaceContextType, WorkspaceRouteType } from "@/context";
import { TreeDir, TreeFile, TreeNode, TreeNodeJType } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath, reduceLineage } from "@/lib/paths";
import clsx from "clsx";
import React, { useEffect } from "react";
import { isAncestor } from "../lib/paths";

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

export function useFileTreeDragAndDrop({
  currentWorkspace,
  onMove,
  onDragEnter,
}: {
  currentWorkspace: Workspace;
  onMove?: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<unknown> | unknown;
  onDragEnter?: (path: string) => void;
}) {
  const { selectedRange, focused } = useFileTreeMenuContext();
  type DragStartType = { dragStart: TreeNode[] };
  type DragStartJType = { dragStart: TreeNodeJType[] };
  //on drag start cancel focus on key up

  const handleDragStart = (event: React.DragEvent, file: TreeNode) => {
    // Create a set of unique file paths from the selected range, the current file, and the focused file
    const allFiles = Array.from(new Set([...selectedRange, file.path.str, focused?.str]))
      .filter(Boolean)
      .map((entry) => absPath(entry));

    // Prepare the data for the internal file type
    const data = JSON.stringify({
      dragStart: Array.from(new Set([...selectedRange, file.path.str, focused?.str]))
        .map((path) => (path ? currentWorkspace.disk.fileTree.nodeFromPath(path) : null))
        .filter(Boolean),
    } satisfies DragStartType);

    // Set the effect allowed for the drag operation
    event.dataTransfer.effectAllowed = "all";

    //log event.dataTransfer items
    event.dataTransfer.clearData();

    // Set the internal file type data
    event.dataTransfer.setData(INTERNAL_FILE_TYPE, data);

    event.dataTransfer.setData("text/html", allFiles.map((url) => `<a href="${url.urlSafe()}">${url}</a>`).join("\n"));

    allFiles.filter(Boolean).forEach((fpath, i) => {
      // const mimeType = currentWorkspace.disk.nodeFromPath(fpath)?.mimeType;
      //using semi-colon to play nice with possible mimeType collision (hackish)
      event.dataTransfer.setData(`${fpath.getMimeType()};index=${i}`, fpath.urlSafe());
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleExternalDrop = async (event: React.DragEvent, targetPath: AbsPath) => {
    // console.debug("External Drop");
    const { files } = event.dataTransfer;
    for (const file of files) {
      try {
        await currentWorkspace.dropImageFile(file, targetPath);
      } catch (e) {
        console.error("Error dropping file:", e);
      }
    }
  };

  const handleDrop = async (event: React.DragEvent, targetNode: TreeNode = currentWorkspace.disk.fileTree.root) => {
    event.preventDefault();
    event.stopPropagation();
    const targetPath = targetNode.type === "dir" ? targetNode.path : targetNode.dirname;
    try {
      if (!event.dataTransfer.getData(INTERNAL_FILE_TYPE)) {
        await handleExternalDrop(event, targetPath);
      } else {
        const { dragStart } = JSON.parse(event.dataTransfer.getData(INTERNAL_FILE_TYPE)) as DragStartJType;

        if (dragStart && dragStart.length) {
          const dragNodes = reduceLineage(dragStart.map((node) => TreeNode.fromJSON(node)));
          return Promise.all(
            dragNodes.filter(({ type: draggedType, path: draggedPath }) => {
              const dropPath = targetPath.join(draggedPath.basename());
              if (draggedType !== "dir" || !isAncestor(dropPath, draggedPath.str)) {
                return onMove?.(currentWorkspace.nodeFromPath(draggedPath)!, dropPath, draggedType);
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
    onDragEnter?.(path);
  };
  return { handleDragStart, handleDragOver, handleDrop, handleDragEnter };
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
  renameDirOrFile: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<AbsPath>;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  currentWorkspace: Workspace;
  expanded: { [path: string]: boolean };
  workspaceRoute: WorkspaceRouteType;
}) {
  const { resetSelects } = useFileTreeMenuContext();

  //This must be done, as old selects can stick around after a remote change or local change / move / rename
  useEffect(() => {
    currentWorkspace.watchDisk(resetSelects, { initialTrigger: false });
  }, [currentWorkspace, resetSelects]);

  const { handleDragEnter, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragAndDrop({
    currentWorkspace,
    onMove: renameDirOrFile,
    onDragEnter: (path: string) => expand(path, true),
  });

  return (
    <SidebarMenu
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, fileTreeDir)}
      onDragEnter={(e) => handleDragEnter(e, "/")}
      className={clsx("p-0", depth === 0 ? "pb-12 pt-2 -ml-[2px]" : "")}
    >
      {Object.values(fileTreeDir.children).map((file) => (
        <Collapsible
          key={`${file.path.str}:${!!expanded[file.path.str]}`}
          open={expanded[file.path.str]}
          onOpenChange={(o) => expand(file.path.str, o)}
        >
          <SidebarMenuItem
            className={file.path.equals(workspaceRoute.path) ? "bg-sidebar-accent" : ""}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, file)}
            onDragEnter={(e) => handleDragEnter(e, file.path.str)}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton asChild>
                {file.isTreeDir() ? (
                  <EditableDir
                    workspaceRoute={workspaceRoute}
                    currentWorkspace={currentWorkspace}
                    depth={depth}
                    onDragStart={(e) => handleDragStart(e, file)}
                    treeDir={file}
                    expand={expandForNode}
                    fullPath={file.path}
                  />
                ) : (
                  <EditableFile
                    workspaceRoute={workspaceRoute}
                    currentWorkspace={currentWorkspace}
                    depth={depth}
                    fullPath={file.path}
                    treeFile={file as TreeFile}
                    expand={expandForNode}
                    onDragStart={(e) => handleDragStart(e, file)}
                  />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
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
              ) : null}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      ))}
    </SidebarMenu>
  );
}
