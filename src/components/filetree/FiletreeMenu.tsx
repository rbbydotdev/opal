import { EditableDir } from "@/components/filetree/EditableDir";
import { EditableFile } from "@/components/filetree/EditableFile";
import { FileItemContextMenuComponentType } from "@/components/filetree/FileItemContextMenuComponentType";
import { FileTreeDragPreview } from "@/components/filetree/FileTreeDragPreview";
import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuContext";
import { TreeDir, TreeDirRoot, TreeNode } from "@/components/filetree/TreeNode";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NoopContextMenu } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useDragImage } from "@/features/filetree-drag-and-drop/useDragImage";
import { useFileTreeDragDrop } from "@/hooks/useFileTreeDragDrop";
import { AbsPath } from "@/lib/paths2";
import { INTERNAL_NODE_FILE_TYPE, NodeDataJType, NodeDataType } from "@/types/FiletreeTypes";
import cn from "clsx";
import React from "react";

// Re-export types for convenience
export { INTERNAL_NODE_FILE_TYPE, type NodeDataJType, type NodeDataType };

export function FileTreeMenu({
  fileTreeDir,
  renameDirOrFileMultiple,
  depth = 0,
  expand,
  expandForNode,
  expanded,
  filter,
  ItemContextMenu = NoopContextMenu,
}: {
  fileTreeDir: TreeDir | TreeDirRoot;
  depth?: number;
  expand: (path: string, value: boolean) => void;
  renameDirOrFileMultiple: (nodes: [oldNode: TreeNode, newNode: TreeNode][]) => Promise<unknown>;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [path: string]: boolean };
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  ItemContextMenu?: FileItemContextMenuComponentType;
}) {
  const { currentWorkspace, workspaceRoute } = useWorkspaceContext();
  const { setReactDragImage, DragImagePortal } = useDragImage();
  const sidebarMenuRef = React.useRef<HTMLUListElement>(null);
  const { highlightDragover, draggingNodes } = useFileTreeMenuCtx();
  const { handleDragEnter, handleDragLeave, handleDragOver, handleDragStart, handleDrop } = useFileTreeDragDrop({
    currentWorkspace,
    onMoveMultiple: renameDirOrFileMultiple,
    onDragEnter: (path: string, data?: NodeDataJType) => {
      if (!data?.nodes?.some((node) => node.path === path) || draggingNodes.some((node) => node.path === path)) {
        expand(path, true);
      }
    },
  });
  const handleDragStartWithImg = (node: TreeNode) => (e: React.DragEvent) => {
    handleDragStart(e, node);
    setReactDragImage(e, <FileTreeDragPreview />);
  };
  const fileNodeChildren = Object.values(fileTreeDir.filterOutChildren(filter));

  return (
    <>
      {DragImagePortal}
      <SidebarMenu
        ref={sidebarMenuRef}
        onDragOver={(e) => handleDragOver(e, fileTreeDir)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, fileTreeDir)}
        onDragEnter={(e) => handleDragEnter(e, "/")}
      >
        {fileNodeChildren.map((fileNode) => (
          <SidebarMenuItem
            key={fileNode.path}
            className={cn({
              "ml-[0.577rem] w-[calc(100%-0.7rem)]": depth === 0,
              "bg-sidebar-accent": highlightDragover(fileNode),
            })}
            onDragOver={(e) => handleDragOver(e, fileNode)}
            onDrop={(e) => handleDrop(e, fileNode)}
            onDragLeave={handleDragLeave}
            onDragEnter={(e) => {
              handleDragEnter(e, fileNode.path);
            }}
          >
            <ItemContextMenu fileNode={fileNode} currentWorkspace={currentWorkspace}>
              {fileNode.isTreeDir() ? (
                <div className="pt-0.5">
                  <Collapsible open={expanded[fileNode.path]} onOpenChange={(o) => expand(fileNode.path, o)}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton asChild>
                        <EditableDir
                          className="my-0.5 pl-3"
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
                    <CollapsibleContent className={cn({ animated: fileNode.hasDirChildren() })}>
                      <FileTreeMenu
                        expand={expand}
                        expandForNode={expandForNode}
                        fileTreeDir={fileNode as TreeDir}
                        renameDirOrFileMultiple={renameDirOrFileMultiple}
                        ItemContextMenu={ItemContextMenu}
                        depth={depth + 1}
                        expanded={expanded}
                        filter={filter}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ) : fileNode.isTreeFile() ? (
                <div className="pt-0.5">
                  <SidebarMenuButton asChild>
                    <EditableFile
                      className="my-0.5 pl-8"
                      workspaceRoute={workspaceRoute}
                      currentWorkspace={currentWorkspace}
                      depth={depth}
                      fullPath={fileNode.path}
                      treeNode={fileNode}
                      expand={expandForNode}
                      onDragStart={handleDragStartWithImg(fileNode)}
                    />
                  </SidebarMenuButton>
                </div>
              ) : null}
            </ItemContextMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
