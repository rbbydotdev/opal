import { isTreeDir, TreeDir, TreeFile, TreeNode, TreeNodeJType } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { useFileTreeMenuContext } from "@/components/SidebarFileMenu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { AbsPath, reduceLineage } from "@/lib/paths";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
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
      fileTree={fileTreeDir.children}
      currentWorkspace={currentWorkspace}
      workspaceRoute={workspaceRoute}
    />
  );
}

function FileTreeMenuInternal({
  fileTree,
  renameDirFile,
  depth = 0,
  expand,
  expandForNode,
  currentWorkspace,
  expanded,
  workspaceRoute,
}: {
  fileTree: TreeDir["children"];
  renameDirFile: (oldNode: TreeNode, newPath: AbsPath, type: "dir" | "file") => Promise<AbsPath>;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  currentWorkspace: Workspace;
  expanded: { [path: string]: boolean };
  workspaceRoute: WorkspaceRouteType;
}) {
  const { selectedRange } = useFileTreeMenuContext();
  type DragStartType = { dragStart: TreeNode[] };
  type DragStartJType = { dragStart: TreeNodeJType[] };
  console.log(selectedRange);
  const handleDragStart = (event: React.DragEvent, file: TreeNode) => {
    const data = JSON.stringify({
      dragStart: Array.from(new Set([...selectedRange, file.path.str]))
        .map((path) => currentWorkspace.disk.fileTree.nodeFromPath(path))
        .filter(Boolean),
    } satisfies DragStartType);
    event.dataTransfer.setData("application/json", data);
    event.dataTransfer.effectAllowed = "move";
    console.debug(`Drag Start: ${file.path}`);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    console.debug(`Drag Over: ${event.currentTarget}`);
  };

  const handleDrop = (event: React.DragEvent, targetNode: TreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    // const draggedData = ;
    async function processDrop(node: TreeNode) {
      const { path: draggedPath, type: draggedType } = node;
      console.log(node);
      if (draggedPath && draggedPath !== targetNode.path) {
        const newPath =
          targetNode.type === "dir"
            ? targetNode.path.join(draggedPath.basename())
            : targetNode.dirname.join(draggedPath.basename());

        if (draggedType === "dir" && isAncestor(newPath, draggedPath.str)) {
          console.debug(`Drop: Cannot move ${draggedPath} inside itself or its subdirectory`);
          return;
        }

        console.debug(`Drop: Moving ${draggedPath} to ${targetNode.path} - ${draggedType}`);
        return renameDirFile(currentWorkspace.nodeFromPath(draggedPath)!, newPath, draggedType);
      } else {
        console.debug(`Drop: Invalid operation or same target`);
      }
    }

    // const { path: draggedPath, type: draggedType } = new TreeNode(JSON.parse(draggedData) as TreeNode);
    try {
      const { dragStart } = JSON.parse(event.dataTransfer.getData("application/json")) as DragStartJType;

      if (dragStart && dragStart.length) {
        console.log(dragStart);
        return Promise.all(
          reduceLineage(dragStart.map((node: TreeNodeJType) => TreeNode.fromJSON(node)))
            .filter(Boolean)
            .map((node) => processDrop(node))
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
    console.debug(`Drag Enter: ${path}`);
  };

  return (
    <SidebarMenu className="gap-0">
      {Object.values(fileTree).map((file) => (
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
                  fileTree={(file as TreeDir).children}
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
