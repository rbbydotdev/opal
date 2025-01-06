"use client";
import { TreeDir } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { CopyMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTreeDir,
  workspaceRoute,
  isIndexed,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  fileTreeDir: TreeDir;
  isIndexed: boolean;
} & React.ComponentProps<typeof SidebarGroup>) {
  const [flatTree, setFlatDirTree] = useState<string[]>(currentWorkspace.getFlatDirTree());
  const router = useRouter();

  const onRename = async (filePath: string, newBasename: string) => {
    const { newPath, newName } = await currentWorkspace.renameFile(filePath, newBasename);
    if (workspaceRoute.path === filePath) {
      router.push(currentWorkspace.resolveFileUrl(newPath));
    }
    return newName;
  };
  useEffect(() => {
    return currentWorkspace.watchFileTree(() => {
      setFlatDirTree(currentWorkspace.getFlatDirTree());
    });
  }, [currentWorkspace, setFlatDirTree]);

  const { setExpandAll, expandSingle, expanded, expandTreeForFilepath } = useFileTreeExpander(
    flatTree,
    currentWorkspace.id
  );

  // Expand the tree to the current file path on initial load
  const initialLoadRef = useRef({ initialLoad: false });
  useEffect(() => {
    if (!workspaceRoute.path || initialLoadRef.current.initialLoad) return;
    initialLoadRef.current.initialLoad = true;
    expandTreeForFilepath(workspaceRoute.path);
  }, [expandTreeForFilepath, initialLoadRef, workspaceRoute.path, currentWorkspace, isIndexed]);

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
          onRename={onRename}
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
