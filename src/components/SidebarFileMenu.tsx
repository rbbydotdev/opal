"use client";
import { Workspace } from "@/clientdb/Workspace";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { withCurrentWorkspace } from "@/context";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function SidebarFileMenuInternal({
  currentWorkspace,
  ...props
}: {
  currentWorkspace: Workspace;
} & React.ComponentProps<typeof SidebarGroup>) {
  const fileTree = currentWorkspace.disk!.fileTree;
  const resolveFileUrl = currentWorkspace.resolveFileUrl;
  const [expanded, updateExpanded] = useLocalStorage<{ [k: string]: boolean } | null>("expandedFiles", null);
  const [fileTreeId, setfileTreeId] = useLocalStorage<string>("filetree_id", fileTree.id);
  const [expCol, toggleExpCol] = useState(true);
  const expand = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };
  const expandAll = useCallback(
    (bool: boolean) => {
      const exp: { [x: string]: boolean } = {};
      fileTree.walk((file) => (exp[file.path] = bool));
      fileTree.children.forEach((file) => (exp[file.path] = true)); //keeps root dirs open
      updateExpanded(exp);
    },
    [fileTree, updateExpanded]
  );

  useEffect(() => {
    if (fileTreeId !== fileTree?.id) {
      updateExpanded({});
      setfileTreeId(fileTree.id);
    }
  }, [expanded, fileTree?.id, fileTreeId, setfileTreeId, updateExpanded]);
  if (!fileTree) return null;
  if (!currentWorkspace) return null;

  return (
    <SidebarGroup {...props} className="h-full p-0">
      <SidebarGroupLabel className="flex justify-between">
        Files
        <div>
          <Button
            onClick={() => {
              expandAll(expCol);
              toggleExpCol(!expCol);
            }}
            className="p-1 m-0 h-fit"
            variant="ghost"
          >
            {expCol ? <Maximize2 /> : <Minimize2 />}
          </Button>
        </div>
      </SidebarGroupLabel>
      <SidebarGroupContent className="overflow-y-scroll h-full scrollbar-thin p-0 pb-16">
        <FileTreeMenu
          resolveFileUrl={resolveFileUrl}
          fileTree={fileTree.children}
          depth={0}
          expand={expand}
          expanded={expanded ?? {}}
        />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
export const SidebarFileMenu = withCurrentWorkspace(SidebarFileMenuInternal);
