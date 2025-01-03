"use client";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { withCurrentWorkspace, WorkspaceRouteType } from "@/context";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CopyMinus } from "lucide-react";
import React, { useCallback, useMemo } from "react";

type ExpandMap = { [path: string]: boolean };
function useFileTreeExpander(fileDirTree: string[], id: string) {
  const expandTree = useMemo(
    () => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: false }), {}),
    [fileDirTree]
  );
  const setAllState = useCallback(
    (state: boolean) => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: state }), {}),
    [fileDirTree]
  );
  const [expanded, updateExpanded] = useLocalStorage<ExpandMap>("SidebarFileMenu/expanded/" + id, expandTree);

  const expandSingle = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };

  const setExpandAll = (state: boolean) => {
    updateExpanded(setAllState(state));
  };

  return { expandSingle, expanded, setExpandAll };
}

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTree,
  workspaceRoute,
  ...props
}: {
  workspaceRoute: WorkspaceRouteType;
  currentWorkspace: Workspace;
  fileTree: Awaited<Workspace["fileTree"]>;
} & React.ComponentProps<typeof SidebarGroup>) {
  const flatDirTree = useMemo(() => fileTree.flatDirTree(), [fileTree]);
  const { setExpandAll, expandSingle, expanded } = useFileTreeExpander(flatDirTree, fileTree.id);

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-between">
        Files
        <div>
          <Button
            onDoubleClick={() => setExpandAll(true)}
            onClick={() => setExpandAll(false)}
            className="p-1 m-0 h-fit"
            variant="ghost"
          >
            <CopyMinus />
          </Button>
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        <FileTreeMenu
          resolveFileUrl={currentWorkspace.resolveFileUrl}
          fileTree={fileTree.children}
          depth={0}
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
