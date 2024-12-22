import { ChevronDown, ChevronRight, Github, Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { FileTree, TreeDir } from "@/lib/files";
import clsx from "clsx";
import { useEffect, useState } from "react";

//fake data deeply nested file structure
// type FileTreeFile = { name: string; type: "file"; id: string };
// type FileTreeDir = { name: string; type: "dir"; id: string; children: FileTree };
// type FileTree = Array<FileTreeFile | FileTreeDir>;

/*
`${depth}:${file.name}`
*/
const FILE_TREE_ID = "filetree_id";
const FILE_TREE = new FileTree([
  "/project/intro/background/file1.md",
  "/project/intro/background/file2.md",
  "/project/intro/overview/file3.md",
  "/project/intro/overview/file4.md",
  "/project/main/chapter1/file5.md",
  "/project/main/chapter1/file6.md",
  "/project/main/chapter2/file7.md",
  "/project/main/chapter2/file8.md",
  "/project/conclusion/summary/file9.md",
  "/project/conclusion/summary/file10.md",
  "/project/conclusion/future_work/file11.md",
  "/project/conclusion/future_work/file12.md",
]);
function FileTreeMenu({
  fileTree,
  depth = 0,
  expand,
  expanded,
}: {
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  fileTree?: TreeDir["children"];
  depth?: number;
}) {
  if (!fileTree) return null;
  const isExpanded = (file: { path: string }) => {
    return !!(expanded && file.path && expanded[file.path]);
  };
  return (
    <SidebarMenuSub className={clsx(depth === 0 ? "m-0" : "")}>
      {fileTree.map((file) => (
        <Collapsible
          key={file.name}
          open={isExpanded(file)}
          defaultOpen={isExpanded(file)}
          onOpenChange={(o) => expand(file.path, o)}
        >
          <SidebarMenuSubItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton asChild>
                {file.type === "dir" ? (
                  <a href={"#"} className="group">
                    <span>
                      <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
                      <ChevronRight size={18} className="group-data-[state=open]:hidden" />
                    </span>
                    <span>{file.name}</span>
                  </a>
                ) : (
                  <a href={"#"} className="group">
                    <span>{file.name}</span>
                  </a>
                )}
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
                <FileTreeMenu expand={expand} fileTree={file.children} depth={depth + 1} expanded={expanded} />
              ) : null}
            </CollapsibleContent>
          </SidebarMenuSubItem>
        </Collapsible>
      ))}
    </SidebarMenuSub>
  );
}

function SidebarFileMenu() {
  const [expanded, updateExpanded] = useLocalStorage<{ [k: string]: boolean } | null>("expandedFiles", null);
  const [fileTreeId, setfileTreeId] = useLocalStorage<string>("filetree_id", FILE_TREE_ID);
  const [expCol, toggleExpCol] = useState(true);
  const expand = (path: string, expanded: boolean) => {
    updateExpanded((prev) => ({ ...prev, [path]: expanded }));
  };
  const expandAll = (bool: boolean) => {
    const exp: { [x: string]: boolean } = {};
    FILE_TREE.walk((file) => (exp[file.path] = bool));
    FILE_TREE.root.children.forEach((file) => (exp[file.path] = true)); //keeps root dirs open
    updateExpanded(exp);
  };

  useEffect(() => {
    if (fileTreeId !== FILE_TREE_ID) {
      updateExpanded({});
      setfileTreeId(FILE_TREE_ID);
    }
  }, [expanded, fileTreeId, setfileTreeId, updateExpanded]);

  return (
    <SidebarGroup className="">
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
      <SidebarGroupContent>
        <FileTreeMenu fileTree={FILE_TREE.children} depth={0} expand={expand} expanded={expanded ?? {}} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="none">
      <SidebarContent className="overflow-hidden">
        <Connections />
        <SidebarFileMenu />
      </SidebarContent>
    </Sidebar>
  );
}

function Connections() {
  return (
    <SidebarGroup className="">
      <SidebarGroupLabel className="flex justify-between">Connections</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={"#"}>
                <Github size={18} />
                <span>Github</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={"#"}>
                <Github size={18} />
                <span>Github</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href={"#"}>
                <Github size={18} />
                <span>Github</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
