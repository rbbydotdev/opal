"use client";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { withCurrentWorkspace } from "@/context";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Maximize2, Minimize2 } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

type ExpandMap = { [path: string]: boolean };

function useFileTreeExpander(fileDirTree: string[], id: string) {
  const expandTree = useMemo(
    () => fileDirTree.reduce<ExpandMap>((acc, file) => ({ ...acc, [file]: false }), {}),
    [fileDirTree]
  );
  const [expanded, updateExpanded] = useLocalStorage<ExpandMap>("SidebarFileMenu/expanded/" + id, expandTree);

  const [allExpanded, setAllExpanded] = useState(false);

  const expandSingle = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };
  const expandAll = useCallback(
    (bool: boolean) => {
      const exp: { [x: string]: boolean } = {};
      fileTree.walk((file) => (exp[file.path] = bool));
      updateExpanded(exp);
    },
    [fileTree, updateExpanded]
  );

  return { expandSingle, allExpanded, expanded, expandAll };
}

function SidebarFileMenuInternal({
  currentWorkspace,
  fileTree,
  ...props
}: {
  currentWorkspace: Workspace;
  fileTree: Awaited<Workspace["fileTree"]>;
} & React.ComponentProps<typeof SidebarGroup>) {
  const flatDirTree = useMemo(() => fileTree.flatDirTree(), [fileTree]);
  const { expandAll, expandSingle, expanded } = useFileTreeExpander(fileDirTree);

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-between">
        Files
        <div>
          <Button onClick={expandAll} className="p-1 m-0 h-fit" variant="ghost">
            {true ? <Maximize2 /> : <Minimize2 />}
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
