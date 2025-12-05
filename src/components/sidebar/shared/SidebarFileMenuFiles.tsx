import { FileTreeMenu } from "@/components/filetree/FiletreeMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { FileItemContextMenuComponentType } from "@/components/filetree/FileItemContextMenuComponentType";
import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuCtxProvider";
import { NULL_TREE_ROOT, ROOT_NODE, TreeDir, TreeNode } from "@/components/filetree/TreeNode";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import { useFileTreeClipboardEventListeners } from "@/components/sidebar/hooks/useFileTreeClipboardEventListeners";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { NoopContextMenu, useFileTree } from "@/context/FileTreeProvider";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";
import { handleDropFilesEventForNode } from "@/hooks/useFileTreeDragDrop";
import { useVisibleFlatTree } from "@/hooks/useVisibleFlatTree";
import { AbsPath } from "@/lib/paths2";
import { cn } from "@/lib/utils";
import { useWorkspaceFileMgmt } from "@/workspace/useWorkspaceFileMgmt";
import clsx from "clsx";
import { ChevronRight, Files, GripVertical } from "lucide-react";
import React, { ComponentProps } from "react";
import { flushSync } from "react-dom";
export const SidebarFileMenuFiles = ({
  children,
  className,
  filter,
  menuTitle,
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
  menuTitle: React.ReactNode;
  children: React.ReactNode;
  canDrag?: boolean;
  scope?: AbsPath;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
  ItemContextMenu?: FileItemContextMenuComponentType;
} & ComponentProps<typeof SidebarGroup>) => {
  const { expandSingle, expanded, expandForNode } = useTreeExpanderContext();
  const { setFileTreeCtx } = useFileTreeMenuCtx();
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
  const { flatTree } = useFileTree();
  const treeExpander = useTreeExpanderContext();
  const visibleFlatTree = useVisibleFlatTree({ flatTree, treeExpander, currentWorkspace });
  const { ref } = useFileTreeClipboardEventListeners({ currentWorkspace });
  const handleBlurForJump = (e: React.KeyboardEvent) => {
    console.log("handleBlurForJump", e);
    // If focus leaves the button, clear focused state
    flushSync(() =>
      setFileTreeCtx((prev) => ({
        ...prev,
        focused: null,
      }))
    );
  };

  const handleJumpToFiles = (e: React.KeyboardEvent) => {
    if (visibleFlatTree.length === 0) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      flushSync(() => {
        setFileTreeCtx((prev) => ({
          ...prev,
          focused: visibleFlatTree[0]!,
        }));
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      flushSync(() => {
        setFileTreeCtx((prev) => ({
          ...prev,
          focused: visibleFlatTree[visibleFlatTree.length - 1]!,
        }));
      });
    }
  };

  return (
    <>
      <ItemContextMenu disabled={!isEmpty} fileNode={fileTreeDir} currentWorkspace={currentWorkspace}>
        <SidebarGroup ref={ref} className={clsx("pl-0 pb-12 py-0 pr-0 ", className)} {...rest}>
          {/* <SidebarGroup data-sidebar-file-menu className={clsx("pl-0 pb-12 py-0 pr-0 ", className)} {...rest}> */}
          <Collapsible
            className="group/collapsible-files flex flex-col min-h-0"
            open={groupExpanded}
            onOpenChange={groupSetExpand}
          >
            <SidebarGroupLabel className="hover:bg-sidebar-accent w-full relative pr-0 flex h-auto justify-between items-center">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton onKeyDown={handleBlurForJump} onKeyUp={handleJumpToFiles} className="w-full">
                  <SidebarGroupLabel className="pl-0 flex w-full truncate justify-start">
                    <div className="flex items-center flex-shrink">
                      {canDrag && <GripVertical size={12} className="mr-0 cursor-grab opacity-50 w-4" />}
                      <ChevronRight
                        size={14}
                        className={
                          "transition-transform duration-100 group-data-[state=open]/selectablelist:rotate-90 group-data-[state=open]/collapsible-files:rotate-90 group-data-[state=closed]/collapsible-files:rotate-0 group-data-[state=closed]/selectablelist:rotate-0 -ml-1"
                        }
                      />
                    </div>

                    <div className="flex justify-start items-center flex-grow w-full truncate">
                      <Icon className="mr-2 flex-shrink-0" size={12} />
                      <div className="truncate">{menuTitle}</div>
                    </div>
                  </SidebarGroupLabel>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {children}
            </SidebarGroupLabel>

            <CollapsibleContent className={cn(collapsibleClassname)}>
              <SidebarContent className="gap-0 flex items-center justify-center scrollbar-thin p-0 pb-2 max-w-full overflow-x-hidden group">
                <>
                  {contentBanner}
                  {isEmpty ? (
                    <div
                      className="w-full px-4 py-2"
                      onDrop={(event) =>
                        handleDropFilesEventForNode({ currentWorkspace, event, targetNode: ROOT_NODE })
                      }
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
