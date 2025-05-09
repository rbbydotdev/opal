"use client";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { useWorkspaceFileMgmt } from "@/components/useWorkspaceFileMgmt";
import { withCurrentWorkspace, WorkspaceContextType } from "@/context";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { CopyMinus, FilePlus, FolderPlus, Settings, Trash2, Undo } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";
import { twMerge } from "tailwind-merge";

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  isIndexed,
  flatTree,
  firstFile,
  workspaces,
  ...props
}: WorkspaceContextType & React.ComponentProps<typeof SidebarGroup>) {
  const { renameFile, addDirFile, removeFiles } = useWorkspaceFileMgmt(currentWorkspace, workspaceRoute);
  const { setExpandAll, expandSingle, expanded, expandForNode } = useFileTreeExpander({
    fileDirTree: flatTree,
    currentPath: workspaceRoute.path,
    id: currentWorkspace.id,
  });

  const addDirFileAndExpand = useCallback(
    (type: TreeNode["type"]) => {
      const newNode = addDirFile(type);
      expandForNode(newNode, true);
      return newNode;
    },
    [addDirFile, expandForNode]
  );
  const addFile = useCallback(() => {
    addDirFileAndExpand("file");
  }, [addDirFileAndExpand]);
  const addDir = useCallback(() => {
    addDirFileAndExpand("dir");
  }, [addDirFileAndExpand]);

  const route = usePathname();
  const isSettingsView = route.endsWith("/settings"); //TODO may need to make a resuable hook to consolidate this logic

  return (
    <SidebarGroup {...props} className={twMerge("h-full p-0 bg-secondary sidebar-group", props.className)}>
      <SidebarGroupContent className="flex justify-end">
        <div className="whitespace-nowrap">
          {isSettingsView ? (
            <Tooltip delayDuration={3000}>
              <TooltipTrigger asChild>
                <Button className="p-1 m-0 h-fit" variant="ghost" asChild>
                  <Link href={currentWorkspace.href}>
                    <Undo />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                Return to Workspace
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip delayDuration={3000}>
              <TooltipTrigger asChild>
                <Button className="p-1 m-0 h-fit" variant="ghost" asChild>
                  <Link href={currentWorkspace.subRoute("settings")}>
                    <Settings />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                Workspace Settings
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={removeFiles} className="p-1 m-0 h-fit" variant="ghost">
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Delete File(s)
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={addFile} className="p-1 m-0 h-fit" variant="ghost">
                <FilePlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              New File
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button onClick={addDir} className="p-1 m-0 h-fit" variant="ghost">
                <FolderPlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              New Folder
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button
                onDoubleClick={() => setExpandAll(true)}
                onClick={() => setExpandAll(false)}
                className="p-1 m-0 h-fit"
                variant="ghost"
              >
                <CopyMinus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Collapse All
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarGroupContent>

      <SidebarGroupLabel>
        <div className="w-full">Files</div>
      </SidebarGroupLabel>

      <SidebarGroupContent className="overflow-y-scroll max-h-12 scrollbar-thin p-0 pb-16 max-w-full overflow-x-hidden"></SidebarGroupContent>

      <SidebarGroupLabel>
        <div className="w-full">Files</div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16 max-w-full overflow-x-hidden">
        {!Object.keys(fileTreeDir.children).length ? (
          <div className="w-full">
            <SidebarGroupLabel className="text-center m-2 p-4 italic border-dashed border h-full">
              <div className="w-full">
                No Files, Click <FilePlus className={"inline"} size={12} /> to get started
              </div>
            </SidebarGroupLabel>
          </div>
        ) : (
          <FileTreeMenu
            renameDirFile={renameFile}
            depth={0}
            expand={expandSingle}
            expandForNode={expandForNode}
            expanded={expanded}
          />
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
const SidebarFileMenuWithWorkspace = withCurrentWorkspace(SidebarFileMenuInternal);

export const SidebarFileMenu = (props: React.ComponentProps<typeof SidebarGroup>) => {
  return <SidebarFileMenuWithWorkspace {...props} />;
};
