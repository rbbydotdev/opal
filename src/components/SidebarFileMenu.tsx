"use client";
import { TreeDir, TreeFile } from "@/clientdb/filetree";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFileTreeExpander } from "@/components/useFileTreeExpander";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { AbsPath } from "@/lib/paths";
import { CopyMinus, FilePlus, FolderPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
  const { onFileRename, onDirRename } = useFileMgmt(currentWorkspace, workspaceRoute);

  const { setExpandAll, expandSingle, expanded } = useFileTreeExpander(
    flatTree,
    workspaceRoute.path,
    currentWorkspace.id
  );

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-end">
        {/* Files */}
        <div>
          <Tooltip delayDuration={3000}>
            <TooltipTrigger asChild>
              <Button
                onDoubleClick={() => setExpandAll(true)}
                onClick={() => setExpandAll(false)}
                className="p-1 m-0 h-fit"
                variant="ghost"
              >
                <FilePlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              New File
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
          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setExpandAll(true)} className="p-1 m-0 h-fit" variant="ghost">
                <CopyPlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Expand All
            </TooltipContent>
          </Tooltip> */}
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
function useFileMgmt(currentWorkspace: Workspace, workspaceRoute: WorkspaceRouteType) {
  const router = useRouter();
  const pathname = usePathname();
  const onFileRename = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    const { newPath, oldPath } = await currentWorkspace.renameFile(oldFullPath, newFullPath);
    if (workspaceRoute.path?.str === oldFullPath.str) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
    }
    return newPath;
  };

  const onDirRename = async (oldFullPath: AbsPath, newFullPath: AbsPath) => {
    const { newPath, oldPath } = await currentWorkspace.renameDir(oldFullPath, newFullPath);
    if (workspaceRoute.path?.startsWith(oldFullPath.str) && workspaceRoute.path) {
      router.push(currentWorkspace.replaceUrlPath(pathname, oldPath, newPath));
    }
    return newPath;
  };
  return { onFileRename, onDirRename };
}
