import { isTreeDir, TreeDir, TreeFile, TreeNode } from "@/clientdb/filetree";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useWorkspaceRoute } from "@/context";
import { AbsPath } from "@/lib/paths";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import React from "react";

export function FileTreeMenu({
  fileTree,
  resolveFileUrl,
  depth = 0,
  expand,
  expandForNode,
  onDirRename,
  onFileRename,
  onFileRemove,
  onCancelNew,
  expanded,
}: {
  resolveFileUrl: (path: AbsPath) => string;
  expand: (path: string, value: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  fileTree: TreeDir["children"];
  onDirRename: (dirPath: AbsPath, newFullPath: AbsPath) => Promise<AbsPath>;
  onFileRename: (filePath: AbsPath, newFullPath: AbsPath) => Promise<AbsPath>;
  onFileRemove: (filePath: AbsPath) => Promise<void>;
  onCancelNew: (newPath: AbsPath) => void;
  depth?: number;
}) {
  const { path: currentFile } = useWorkspaceRoute();

  const handleDragStart = (event: React.DragEvent, file: TreeNode) => {
    const data = JSON.stringify(file);
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
    const draggedData = event.dataTransfer.getData("application/json");
    try {
      //on dir rename if dir is dragged into child return
      const { path: draggedPath, type: draggedType } = new TreeNode(JSON.parse(draggedData) as TreeNode);

      if (draggedPath && draggedPath !== targetNode.path) {
        const newPath =
          targetNode.type === "dir"
            ? targetNode.path.join(draggedPath.basename())
            : targetNode.dirname.join(draggedPath.basename());

        if (draggedType === "dir" && newPath.startsWith(draggedPath.str)) {
          console.debug(`Drop: Cannot move ${draggedPath} inside itself or its subdirectory`);
          return;
        }

        console.debug(`Drop: Moving ${draggedPath} to ${targetNode.path} - ${draggedType}`);

        if (draggedType === "dir") {
          onDirRename(draggedPath, newPath);
        } else if (draggedType === "file") {
          onFileRename(draggedPath, newPath);
        } else {
          console.error(`Drop: Invalid type ${draggedType}`);
        }
        // Implement your logic to update the file tree
      } else {
        console.debug(`Drop: Invalid operation or same target`);
      }
    } catch (error) {
      console.error("Error parsing dragged data:", error);
    }
  };

  const handleDragEnter = (event: React.DragEvent, path: string) => {
    event.preventDefault();
    expand(path, true);
    console.debug(`Drag Enter: ${path}`);
  };
  return (
    <SidebarMenu>
      {Object.values(fileTree).map((file) => (
        <Collapsible
          key={file.path.str}
          open={expanded[file.path.str]}
          defaultOpen={expanded[file.path.str]}
          onOpenChange={(o) => expand(file.path.str, o)}
        >
          <SidebarMenuItem
            className={currentFile?.str === file.path.str ? "bg-sidebar-accent" : ""}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, file)}
            onDragEnter={(e) => handleDragEnter(e, file.path.str)}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton asChild>
                {isTreeDir(file) ? (
                  <EditableDir
                    depth={depth}
                    onRename={(newPath) => onDirRename(file.path, newPath)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                    onCancelNew={onCancelNew}
                    treeDir={file}
                    onFileRemove={onFileRemove}
                    expand={expandForNode}
                    fullPath={file.path}
                  />
                ) : (
                  <EditableFile
                    href={resolveFileUrl(file.path)}
                    depth={depth}
                    onFileRemove={onFileRemove}
                    onRename={(newPath) => onFileRename(file.path, newPath)}
                    onCancelNew={onCancelNew}
                    fullPath={file.path}
                    treeFile={file as TreeFile}
                    expand={expandForNode}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                  />
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
                <FileTreeMenu
                  expand={expand}
                  expandForNode={expandForNode}
                  onFileRename={onFileRename}
                  onFileRemove={onFileRemove}
                  onDirRename={onDirRename}
                  onCancelNew={onCancelNew}
                  fileTree={(file as TreeDir).children}
                  depth={depth + 1}
                  expanded={expanded}
                  resolveFileUrl={resolveFileUrl}
                />
              ) : null}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      ))}
    </SidebarMenu>
  );
}
