"use client";
import { FileItemContextMenuComponentType } from "@/components/FileItemContextMenuComponentType";
import { FileTreeMenu } from "../../FiletreeMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";

import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import clsx from "clsx";
import { ChevronRight, Files } from "lucide-react";
import React, { JSX } from "react";
import { useWorkspaceContext } from "../../../context/WorkspaceHooks";
import { useHandleDropFilesEventForNode } from "../../../features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useSingleItemExpander } from "../../../features/tree-expander/useSingleItemExpander";
import { TreeDir, TreeDirRoot, TreeNode } from "../../../lib/FileTree/TreeNode";
import { absPath, AbsPath } from "../../../lib/paths2";
import { useFileTreeMenuCtx } from "../../FileTreeMenuCtxProvider";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "../../ui/sidebar";
export const SidebarFileMenuFiles = ({
  fileTreeDir,
  renameDirOrFileMultiple,
  expandSingle,
  expandForNode,
  expanded,
  children,
  className,
  filter,
  title,
  Icon = Files,
  FileItemContextMenu,
  ...rest
}: {
  fileTreeDir: TreeDirRoot;
  className?: string;
  expandSingle: (path: string, expanded: boolean) => void;
  expandForNode: (node: TreeNode, state: boolean) => void;
  expanded: { [key: string]: boolean };
  renameDirOrFileMultiple: (nodes: [TreeNode, TreeNode | AbsPath][]) => Promise<unknown>;
  title: JSX.Element | string;
  children: React.ReactNode;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  FileItemContextMenu: FileItemContextMenuComponentType;
}) => {
  const { id } = useFileTreeMenuCtx();
  const [groupExpanded, groupSetExpand] = useSingleItemExpander("SidebarFileMenuFiles/" + id);
  const { currentWorkspace } = useWorkspaceContext();
  const handleExternalDropEvent = useHandleDropFilesEventForNode({ currentWorkspace });

  const isEmpty = !Object.keys(fileTreeDir?.filterOutChildren?.(filter) ?? {}).length;
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
                    fileTreeDir={fileTreeDir as TreeDir}
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
