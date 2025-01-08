"use client";
import { TreeDir, TreeFile } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { CopyMinus, CopyPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  isIndexed,
  flatTree,
  firstFile,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  fileTreeDir: TreeDir;
  flatTree: string[];
  firstFile: TreeFile | null;
  isIndexed: boolean;
} & React.ComponentProps<typeof SidebarGroup>) {
  const router = useRouter();
  //hoist this logic up?
  const onFileRename = async (filePath: string, newBasename: string) => {
    const { newPath, newName } = await currentWorkspace.renameFile(filePath, newBasename);
    if (workspaceRoute.path === filePath) {
      router.push(currentWorkspace.resolveFileUrl(newPath));
    }
    return newName;
  };

  const onDirRename = async (filePath: string, newBasename: string) => {
    const { newPath, newName } = await currentWorkspace.renameFile(filePath, newBasename);
    if (workspaceRoute.path === filePath) {
      router.push(currentWorkspace.resolveFileUrl(newPath));
    }
    return newName;
  };

  const { setExpandAll, expandSingle, expanded } = useFileTreeExpander(
    flatTree,
    workspaceRoute.path,
    currentWorkspace.id
  );

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-between">
        Files
        <div>
          <Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setExpandAll(true)} className="p-1 m-0 h-fit" variant="ghost">
                <CopyPlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Expand All
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        <FileTreeMenu
          onFileRename={onFileRename}
          onDirRename={onDirRename}
          resolveFileUrl={currentWorkspace.resolveFileUrl}
          fileTree={fileTreeDir.children}
          depth={0}
          currentFile={workspaceRoute.path}
          expand={expandSingle}
          expanded={expanded}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
const SidebarFileMenuWithWorkspace = withCurrentWorkspace(SidebarFileMenuInternal);

export const SidebarFileMenu = (props: React.ComponentProps<typeof SidebarGroup>) => {
  return <SidebarFileMenuWithWorkspace {...props} />;
};
