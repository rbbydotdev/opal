import { isTreeDir, TreeDir, TreeFile, TreeNode } from "@/clientdb/filetree";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { AbsPath } from "@/lib/paths";
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
  onFileRemove,
  expanded,
}: {
  resolveFileUrl: (path: AbsPath) => string;
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  currentFile: AbsPath | null;
  fileTree: TreeDir["children"];
  onDirRename: (dirPath: AbsPath, newFullPath: AbsPath) => Promise<AbsPath>;
  onFileRename: (filePath: AbsPath, newFullPath: AbsPath) => Promise<AbsPath>;
  onFileRemove: (filePath: AbsPath) => Promise<void>;
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
      //on dir rename if dir is dragged into child return
      const { path: draggedPath, type: draggedType } = new TreeNode(JSON.parse(draggedData) as TreeNode);
      if (draggedPath && draggedPath !== targetNode.path) {
        const newPath =
          targetNode.type === "dir"
            ? targetNode.path.join(draggedPath.basename())
            : targetNode.dirname.join(draggedPath.basename());

        if (draggedType === "dir" && newPath.startsWith(draggedPath.str)) {
          console.log(`Drop: Cannot move ${draggedPath} inside itself or its subdirectory`);
          return;
        }

        console.log(`Drop: Moving ${draggedPath} to ${targetNode.path} - ${draggedType}`);

        if (draggedType === "dir") {
          // console.log(`onDirRename(${draggedPath}, ${newPath})`);
          onDirRename(draggedPath, newPath);
        } else if (draggedType === "file") {
          // console.log(`onFileRename(${draggedPath}, ${newPath})`);
          onFileRename(draggedPath, newPath);
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
                    treeDir={file}
                    onFileRemove={onFileRemove}
                    fullPath={file.path}
                  />
                ) : (
                  <EditableFile
                    href={resolveFileUrl(file.path)}
                    isSelected={currentFile?.str === file.path.str}
                    depth={depth}
                    onFileRemove={onFileRemove}
                    onRename={(newPath) => onFileRename(file.path, newPath)}
                    fullPath={file.path}
                    treeFile={file as TreeFile}
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
                  onFileRename={onFileRename}
                  onFileRemove={onFileRemove}
                  onDirRename={onDirRename}
                  fileTree={(file as TreeDir).children}
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
