import { isTreeDir, TreeDir, TreeFile, TreeNode } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { AbsPath } from "@/lib/paths";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import React from "react";

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

// function findCommonAncestor(node1: HTMLElement, node2: HTMLElement): HTMLElement | null {
//   const ancestors1: Set<HTMLElement> = new Set();
//   let current: HTMLElement | null = node1;

//   while (current) {
//     ancestors1.add(current);
//     current = current.parentElement;
//   }

//   current = node2;
//   while (current) {
//     if (ancestors1.has(current)) {
//       return current;
//     }
//     current = current.parentElement;
//   }

//   return null;
// }

// function collectNodesToAncestor(node: HTMLElement, ancestor: HTMLElement): HTMLElement[] {
//   const nodes: HTMLElement[] = [];
//   let current: HTMLElement | null = node;

//   while (current && current !== ancestor) {
//     if (current.hasAttribute("data-node")) {
//       nodes.push(current);
//     }
//     current = current.parentElement;
//   }

//   if (ancestor.hasAttribute("data-node")) {
//     nodes.push(ancestor);
//   }

//   return nodes;
// }

// function getRangeArray(node1: HTMLElement, node2: HTMLElement): HTMLElement[] {
//   const commonAncestor = findCommonAncestor(node1, node2);
//   if (!commonAncestor) {
//     return [];
//   }

//   const nodes1 = collectNodesToAncestor(node1, commonAncestor);
//   const nodes2 = collectNodesToAncestor(node2, commonAncestor);

//   return [...nodes1.reverse(), ...nodes2];
// }

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
        renameDirFile(currentWorkspace.nodeFromPath(draggedPath)!, newPath, draggedType);
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

  // const [selectedRange, setSelectedRange] = useState<TreeNode[]>([]);
  // const [shiftPressed, setShiftPressed] = useState<boolean>(false);
  // const [startNode, setStartNode] = useState<TreeNode | null>(null);

  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     if (event.key === "Shift") {
  //       setShiftPressed(true);
  //     }
  //   };

  //   const handleKeyUp = (event: KeyboardEvent) => {
  //     if (event.key === "Shift") {
  //       setShiftPressed(false);
  //       setStartNode(null); // Reset start index when shift is released
  //     }
  //   };

  //   document.addEventListener("keydown", handleKeyDown);
  //   document.addEventListener("keyup", handleKeyUp);

  //   return () => {
  //     document.removeEventListener("keydown", handleKeyDown);
  //     document.removeEventListener("keyup", handleKeyUp);
  //   };
  // }, []);

  // const handleItemClick = (node: TreeNode) => (event: React.MouseEvent<HTMLDivElement>) => {
  //   if (shiftPressed) {
  //     if (startNode === null) {
  //       setStartNode(node);
  //     } else {
  //       const endNode = node;
  //       const range = [startNode, endNode];
  //       console.log({ range });
  //       setSelectedRange(range);
  //     }
  //   } else {
  //     // If shift is not pressed, reset the selection
  //     setSelectedRange([]);
  //     setStartNode(null);
  //   }
  // };

  return (
    <SidebarMenu data-node="root">
      {Object.values(fileTree).map((file) => (
        <Collapsible
          key={file.path.str}
          open={expanded[file.path.str]}
          defaultOpen={expanded[file.path.str]}
          onOpenChange={(o) => expand(file.path.str, o)}
          // onClick={handleItemClick(file)}
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
