import { TreeDir, TreeNode } from "@/clientdb/filetree";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import React from "react";

export function FileTreeMenu({
  fileTree,
  resolveFileUrl,
  depth = 0,
  expand,
  currentFile,
  onDirRename,
  onFileRename,
  expanded,
}: {
  resolveFileUrl: (path: string) => string;
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  currentFile: string | null;
  fileTree: TreeDir["children"];
  onDirRename: (dirPath: string, newBaseName: string) => Promise<string> | string;
  onFileRename: (filePath: string, newBaseName: string) => Promise<string> | string;
  depth?: number;
}) {
  const handleDragStart = (event: React.DragEvent, file: TreeNode) => {
    const data = JSON.stringify(file);
    event.dataTransfer.setData("application/json", data);
    event.dataTransfer.effectAllowed = "move";
    console.log(`Drag Start: ${file.path}`);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    console.log(`Drag Over: ${event.currentTarget}`);
  };

  const handleDrop = (event: React.DragEvent, targetNode: TreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedData = event.dataTransfer.getData("application/json");
    try {
      const { path: draggedPath, type: draggedType } = JSON.parse(draggedData) as TreeNode;
      if (draggedPath && draggedPath !== targetNode.path) {
        console.log(`Drop: Moving ${draggedPath} to ${targetNode.path} - ${draggedType}`);
        if (draggedType === "dir") {
          console.log(`onDirRename(${draggedPath}, ${targetNode.path})`);
          // onDirRename(draggedItemPath, targetNode);
        } else if (draggedType === "file") {
          console.log(
            `onFileRename(${draggedPath}, ${targetNode.type === "file" ? targetNode.dirname : targetNode.path})`
          );
          // onFileRename(draggedItemPath, targetNode);
        } else {
          console.error(`Drop: Invalid type ${draggedType}`);
        }
        // Implement your logic to update the file tree
      } else {
        console.log(`Drop: Invalid operation or same target`);
      }
    } catch (error) {
      console.error("Error parsing dragged data:", error);
    }
  };

  const handleDragEnter = (event: React.DragEvent, path: string) => {
    event.preventDefault();
    expand(path, true);
    console.log(`Drag Enter: ${path}`);
  };

  return (
    <SidebarMenu>
      {fileTree.map((file) => (
        <Collapsible
          key={file.path}
          open={expanded[file.path]}
          defaultOpen={expanded[file.path]}
          onOpenChange={(o) => expand(file.path, o)}
        >
          <SidebarMenuItem
            className={currentFile === file.path ? "bg-sidebar-accent" : ""}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, file)}
            onDragEnter={(e) => handleDragEnter(e, file.path)}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton asChild>
                {file.type === "dir" ? (
                  <EditableDir
                    depth={depth}
                    onRename={(newBasename) => onDirRename(file.path, newBasename)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                  >
                    {file.name}
                  </EditableDir>
                ) : (
                  <EditableFile
                    href={resolveFileUrl(file.path)}
                    isSelected={currentFile === file.path}
                    depth={depth}
                    onRename={(newBasename) => onFileRename(file.path, newBasename)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file)}
                  >
                    {file.name}
                  </EditableFile>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
                <FileTreeMenu
                  expand={expand}
                  onFileRename={onFileRename}
                  onDirRename={onDirRename}
                  fileTree={file.children}
                  depth={depth + 1}
                  currentFile={currentFile}
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
