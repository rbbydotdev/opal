"use client";
import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useFileTreeMenuCtx } from "@/components/FileTreeMenuCtxProvider";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useHandleDropFilesEventForNode } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";
import { NULL_TREE_ROOT, TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { absPath, AbsPath } from "@/lib/paths2";
import clsx from "clsx";
import { ChevronRight, Files } from "lucide-react";
import React, { JSX, useMemo } from "react";
export const SidebarFileMenuFiles = ({
  children,
  className,
  filter,
  title,
  Icon = Files,
  scope,
  FileItemContextMenu,
  ...rest
}: {
  className?: string;
  title: JSX.Element | string;
  children: React.ReactNode;
  scope?: AbsPath;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  FileItemContextMenu: FileItemContextMenuComponentType;
}) => {
  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const { fileTreeDir, currentWorkspace } = useWorkspaceContext();
  const { renameDirOrFileMultiple } = useWorkspaceFileMgmt(currentWorkspace);

  const treeNode = useMemo(() => {
    const node =
      typeof scope === "undefined" ? fileTreeDir : currentWorkspace.nodeFromPath(scope ?? null) ?? NULL_TREE_ROOT;
    if (!node.isTreeDir()) {
      throw new Error("SidebarFileMenuFiles: scoped node is not a TreeDir");
    }
    return node;
  }, [currentWorkspace, fileTreeDir, scope]);
  const { id } = useFileTreeMenuCtx();
  const [groupExpanded, groupSetExpand] = useSingleItemExpander("SidebarFileMenuFiles/" + id);
  const handleExternalDropEvent = useHandleDropFilesEventForNode({ currentWorkspace });

  const isEmpty = !Object.keys(treeNode.filterOutChildren(filter) ?? {}).length;
  return (
    <>
      <FileItemContextMenu
        disabled={!isEmpty}
        fileNode={currentWorkspace.getFileTreeRoot()}
        currentWorkspace={currentWorkspace}
      >
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
              {<div>{children}</div>}
            </SidebarGroupLabel>

            <CollapsibleContent className="min-h-0 flex-shrink">
              <SidebarContent className="overflow-y-auto h-full scrollbar-thin p-0 pb-2 max-w-full overflow-x-hidden border-l-2 group">
                {isEmpty ? (
                  <div
                    className="w-full"
                    onDrop={(e) => handleExternalDropEvent(e, TreeNode.FromPath(absPath("/"), "dir"))}
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
              </SidebarContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </FileItemContextMenu>
    </>
  );
};
