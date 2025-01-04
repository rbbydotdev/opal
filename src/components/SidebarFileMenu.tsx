"use client";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { CopyMinus } from "lucide-react";
import React, { useMemo } from "react";

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTree,
  workspaceRoute,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  fileTree: ReturnType<Workspace["getFileTree"]>;
} & React.ComponentProps<typeof SidebarGroup>) {
  const flatDirTree = useMemo(() => currentWorkspace.getFlatDirTree(), [currentWorkspace]);
  const { setExpandAll, expandSingle, expanded } = useFileTreeExpander(
    workspaceRoute.path,
    flatDirTree,
    currentWorkspace.guid
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
              Expand/Collapse All
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        <FileTreeMenu
          resolveFileUrl={currentWorkspace.resolveFileUrl}
          fileTree={fileTree.children}
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
