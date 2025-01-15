import { isTreeDir, TreeDir, TreeFile, TreeNode, TreeNodeJType } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { useFileTreeMenuContext } from "@/components/FileTreeContext";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { AbsPath } from "@/lib/paths";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import clsx from "clsx";
import React from "react";
import { isAncestor } from "../lib/paths";

export const FileTreeMenu = withCurrentWorkspace(FileTreeContainer);

export function FileTreeContainer({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  fileTreeDir: TreeDir;
  flatTree: string[];
  firstFile: TreeFile | null;
  isIndexed: boolean;
} & React.ComponentProps<typeof FileTreeMenuInternal>) {
  return (
    <FileTreeMenuInternal
      {...props}
      fileTreeDir={fileTreeDir}
      currentWorkspace={currentWorkspace}
      workspaceRoute={workspaceRoute}
    />
  );
}

function useFileTreeDragAndDrop({
  currentWorkspace,
  renameDirFile,
  expand,
}: {
  renameDirFile: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<AbsPath>;
  currentWorkspace: Workspace;
  expand: (path: string, value: boolean) => void;
}) {
  const { selectedRange, focused } = useFileTreeMenuContext();
  type DragStartType = { dragStart: TreeNode[] };
  type DragStartJType = { dragStart: TreeNodeJType[] };
  //on drag start cancel focus on key up
  const handleDragStart = (event: React.DragEvent, file: TreeNode) => {
    const data = JSON.stringify({
      dragStart: Array.from(new Set([...selectedRange, file.path.str, focused?.str]))
        .map((path) => (path ? currentWorkspace.disk.fileTree.nodeFromPath(path) : null))
        .filter(Boolean),
    } satisfies DragStartType);
    event.dataTransfer.setData("application/json", data);
    event.dataTransfer.effectAllowed = "move";
    // console.debug(`Drag Start: ${file.path}`);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    // console.debug(`Drag Over: ${event.currentTarget}`);
  };

  const handleDrop = (event: React.DragEvent, targetNode: TreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const { dragStart } = JSON.parse(event.dataTransfer.getData("application/json")) as DragStartJType;
      if (dragStart && dragStart.length) {
        return Promise.all(
          dragStart
            .map((node) => TreeNode.fromJSON(node))
            .filter(({ type: draggedType, path: draggedPath }) => {
              const newPath =
                targetNode.type === "dir"
                  ? targetNode.path.join(draggedPath.basename())
                  : targetNode.dirname.join(draggedPath.basename());
              if (draggedType !== "dir" || !isAncestor(newPath, draggedPath.str)) {
                return renameDirFile(currentWorkspace.nodeFromPath(draggedPath)!, newPath, draggedType);
              }
            })
        );
      }
    } catch (e) {
      console.error("Error parsing dragged data:", e);
      return;
    }
  };

  const handleDragEnter = (event: React.DragEvent, path: string) => {
    event.preventDefault();
    expand(path, true);
    // console.debug(`Drag Enter: ${path}`);
  };
  return { handleDragStart, handleDragOver, handleDrop, handleDragEnter };
}

function FileTreeMenuInternal({
  fileTreeDir,
  renameDirFile,
  depth = 0,
  expand,
  expandForNode,
  currentWorkspace,
  expanded,
  workspaceRoute,
}: {
  fileTreeDir: TreeDir;
  renameDirFile: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<AbsPath>;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  currentWorkspace: Workspace;
  expanded: { [path: string]: boolean };
  workspaceRoute: WorkspaceRouteType;
}) {
  const { handleDragEnter, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragAndDrop({
    currentWorkspace,
    renameDirFile,
    expand,
  });

  return (
    <SidebarMenu
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, fileTreeDir)}
      onDragEnter={(e) => handleDragEnter(e, "/")}
      className={clsx("gap-0", depth === 0 ? "pb-12 pt-2" : "")}
    >
      {Object.values(fileTreeDir.children).map((file) => (
        <Collapsible
          key={file.path.str}
          open={expanded[file.path.str]}
          defaultOpen={expanded[file.path.str]}
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
                {isTreeDir(file) ? (
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
                  renameDirFile={renameDirFile}
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
