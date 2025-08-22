import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { handleDropFilesEventForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { NULL_TREE_ROOT, RootNode, TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import clsx from "clsx";
import { ChevronRight, Files } from "lucide-react";
import React, { ComponentProps, JSX, useMemo } from "react";
export const SidebarFileMenuFiles = ({
  children,
  className,
  filter,
  title,
  Icon = Files,
  scope,
  contentBanner = null,
  FileItemContextMenu,
  ...rest
}: {
  className?: string;
  contentBanner?: React.ReactNode | null;
  title: JSX.Element | string;
  children: React.ReactNode;
  scope?: AbsPath;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  FileItemContextMenu: FileItemContextMenuComponentType;
} & ComponentProps<typeof SidebarGroup>) => {
  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const { currentWorkspace } = useWorkspaceContext();
  const { fileTreeDir } = useFileTree();
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

  //TODO i dont think this is updating when it should
  const treeNode = scope ? (currentWorkspace.nodeFromPath(scope ?? null) ?? NULL_TREE_ROOT) : fileTreeDir;
  if (!treeNode.isTreeDir()) {
    throw new Error("SidebarFileMenuFiles: scoped node is not a TreeDir");
  }
  // const treeNode = useMemo(() => {
  //   const node =
  //     typeof scope === "undefined" ? fileTreeDir : (currentWorkspace.nodeFromPath(scope ?? null) ?? NULL_TREE_ROOT);
  //   if (!node.isTreeDir()) {
  //     throw new Error("SidebarFileMenuFiles: scoped node is not a TreeDir");
  //   }
  //   return node;
  // }, [currentWorkspace, fileTreeDir, scope]);

  const { expanderId } = useTreeExpanderContext();
  const [groupExpanded, groupSetExpand] = useSingleItemExpander("SidebarFileMenuFiles/" + expanderId);

  const isEmpty = !Object.keys(treeNode.filterOutChildren(filter) ?? {}).length;
  const fileTreeRoot = useMemo(() => currentWorkspace.getFileTreeRoot(), [currentWorkspace]);
  return (
    <>
      <FileItemContextMenu disabled={!isEmpty} fileNode={fileTreeRoot} currentWorkspace={currentWorkspace}>
        <SidebarGroup data-sidebar-file-menu className={clsx("pl-0 pb-12 py-0 pr-0 w-full", className)} {...rest}>
          <Collapsible
            className="group/collapsible flex flex-col min-h-0"
            open={groupExpanded}
            onOpenChange={groupSetExpand}
          >
            <SidebarGroupLabel className="hover:bg-sidebar-accent relative w-full pr-0 overflow-hidden">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <SidebarGroupLabel className="pl-0">
                    <div className="flex items-center">
                      <ChevronRight
                        size={14}
                        className={
                          "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                        }
                      />
                    </div>
                    <div className="flex justify-center items-center">
                      <Icon className="mr-2" size={12} />
                      {title}
                    </div>
                  </SidebarGroupLabel>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <div>{children}</div>
            </SidebarGroupLabel>

            <CollapsibleContent className="min-h-0 flex-shrink">
              <SidebarContent className="overflow-y-auto h-full flex items-center justify-center scrollbar-thin p-0 pb-2 max-w-full overflow-x-hidden border-l-2 group">
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
                    <FileTreeMenu
                      fileTreeDir={treeNode as TreeDir}
                      expand={expandSingle}
                      filter={filter}
                      renameDirOrFileMultiple={renameDirOrFileMultiple}
                      expandForNode={expandForNode}
                      FileItemContextMenu={FileItemContextMenu}
                      expanded={expanded}
                      depth={0}
                    />
                  )}
                </>
              </SidebarContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </FileItemContextMenu>
    </>
  );
};
