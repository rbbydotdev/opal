import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { NoopContextMenu, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { handleDropFilesEventForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { NULL_TREE_ROOT, RootNode, TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import clsx from "clsx";
import { ChevronRight, Files, GripVertical } from "lucide-react";
import React, { ComponentProps, JSX } from "react";
export const SidebarFileMenuFiles = ({
  children,
  className,
  filter,
  title,
  collapsibleClassname,
  Icon = Files,
  scope,
  canDrag = true,
  contentBanner = null,
  ItemContextMenu = NoopContextMenu,
  ...rest
}: {
  collapsibleClassname?: string;
  className?: string;
  contentBanner?: React.ReactNode | null;
  title: JSX.Element | string;
  children: React.ReactNode;
  canDrag?: boolean;
  scope?: AbsPath;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  ItemContextMenu?: FileItemContextMenuComponentType;
} & ComponentProps<typeof SidebarGroup>) => {
  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTreeDir } = useFileTree();
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

  const treeNode = scope ? (currentWorkspace.nodeFromPath(scope ?? null) ?? NULL_TREE_ROOT) : fileTreeDir;
  if (!treeNode.isTreeDir()) {
    throw new Error("SidebarFileMenuFiles: scoped node is not a TreeDir");
  }

  const { expanderId, defaultExpanded } = useTreeExpanderContext();
  const [groupExpanded, groupSetExpand] = useSingleItemExpander("SidebarFileMenuFiles/" + expanderId, defaultExpanded);

  const isEmpty = !Object.keys(treeNode.filterOutChildren(filter) ?? {}).length;

  return (
    <>
      <ItemContextMenu disabled={!isEmpty} fileNode={fileTreeDir} currentWorkspace={currentWorkspace}>
        <SidebarGroup data-sidebar-file-menu className={clsx("pl-0 pb-12 py-0 pr-0 ", className)} {...rest}>
          <Collapsible
            className="group/collapsible-files flex flex-col min-h-0"
            open={groupExpanded}
            onOpenChange={groupSetExpand}
          >
            <SidebarGroupLabel className="hover:bg-sidebar-accent relative pr-0 flex flex-wrap h-auto justify-between items-center">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="w-auto flex-grow">
                  <SidebarGroupLabel className="pl-0">
                    <div className="flex items-center">
                      {canDrag && <GripVertical size={12} className="mr-0 cursor-grab opacity-50 w-4" />}
                      <ChevronRight
                        size={14}
                        className={
                          "transition-transform duration-100 group-data-[state=open]/selectablelist:rotate-90 group-data-[state=open]/collapsible-files:rotate-90 group-data-[state=closed]/collapsible-files:rotate-0 group-data-[state=closed]/selectablelist:rotate-0 -ml-1"
                        }
                      />
                    </div>

                    <div className="flex justify-center items-center ">
                      <Icon className="mr-2" size={12} />
                      {title}
                    </div>
                  </SidebarGroupLabel>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {children}
            </SidebarGroupLabel>

            <CollapsibleContent className={cn(collapsibleClassname)}>
              <SidebarContent className="flex items-center justify-center scrollbar-thin p-0 pb-2 max-w-full overflow-x-hidden group">
                <>
                  {contentBanner}
                  {isEmpty ? (
                    <div
                      className="w-full px-4 py-2"
                      onDrop={(event) => handleDropFilesEventForNode({ currentWorkspace, event, targetNode: RootNode })}
                    >
                      <EmptySidebarLabel label={"empty"} />
                    </div>
                  ) : (
                    <div className="w-full min-w-0">
                      <FileTreeMenu
                        fileTreeDir={treeNode as TreeDir}
                        expand={expandSingle}
                        filter={filter}
                        renameDirOrFileMultiple={renameDirOrFileMultiple}
                        ItemContextMenu={ItemContextMenu}
                        expandForNode={expandForNode}
                        expanded={expanded}
                        depth={0}
                      />
                    </div>
                  )}
                </>
              </SidebarContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </ItemContextMenu>
    </>
  );
};
