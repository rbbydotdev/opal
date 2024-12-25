"use client";
import { FileTreeMenu } from "@/components/FiletreeMenu";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FileTree, FileTreeJType } from "@/shapes/filetree";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function SidebarFileMenu({
  fileTreeJson,
  ...props
}: {
  fileTreeJson: FileTreeJType;
} & React.ComponentProps<typeof SidebarGroup>) {
  const fileTree = useMemo(() => FileTree.fromJSON(fileTreeJson), [fileTreeJson]);
  const [expanded, updateExpanded] = useLocalStorage<{ [k: string]: boolean } | null>("expandedFiles", null);
  const [fileTreeId, setfileTreeId] = useLocalStorage<string>("filetree_id", fileTreeJson.id);
  const [expCol, toggleExpCol] = useState(true);
  const expand = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };
  // const width = useMemo(() => {
  //   let max = 12;
  //   fileTree.walk((file, depth = 0) => {
  //     if (file.name.length + depth * 2 > max) {
  //       max = file.name.length + depth * 2;
  //     }
  //   });
  //   return max;
  // }, [fileTree]);
  const expandAll = (bool: boolean) => {
    const exp: { [x: string]: boolean } = {};
    fileTree.walk((file) => (exp[file.path] = bool));
    fileTree.children.forEach((file) => (exp[file.path] = true)); //keeps root dirs open
    updateExpanded(exp);
  };

  useEffect(() => {
    if (fileTreeId !== fileTreeJson.id) {
      updateExpanded({});
      setfileTreeId(fileTreeJson.id);
    }
  }, [expanded, fileTreeJson.id, fileTreeId, setfileTreeId, updateExpanded]);

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
        <FileTreeMenu fileTreeChildren={fileTree.children} depth={0} expand={expand} expanded={expanded ?? {}} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
