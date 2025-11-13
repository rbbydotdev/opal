import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { TreeDir, TreeDirRoot, TreeNode } from "@/lib/FileTree/TreeNode";
import { AbsPath } from "@/lib/paths2";
import cn from "clsx";
import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";

export function ReadOnlyFileTree({
  fileTreeDir,
  expanded,
  onToggle,
  depth = 0,
  children,
  filter,
}: {
  fileTreeDir: TreeDir | TreeDirRoot;
  expanded: { [path: string]: boolean };
  onToggle: (path: string, value: boolean) => void;
  depth?: number;
  filter?: ((node: TreeNode) => boolean) | AbsPath[];
  children?: React.ReactNode;
}) {
  const fileNodeChildren = Object.values(fileTreeDir.filterOutChildren(filter));

  return (
    <SidebarMenu className={cn({ "-mt-4": depth === 0 })}>
      {fileNodeChildren.map((fileNode) => (
        <SidebarMenuItem
          key={fileNode.path}
          className={cn({
            "ml-[0.577rem] w-[calc(100%-0.7rem)]": depth === 0,
          })}
        >
          {children}
          {fileNode.isTreeDir() ? (
            <div className="pt-0.5">
              <Collapsible open={expanded[fileNode.path]} onOpenChange={(o) => onToggle(fileNode.path, o)}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="my-0.5 pl-3 w-full justify-start">
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${expanded[fileNode.path] ? "rotate-90" : ""}`}
                    />
                    <FolderIcon className="h-4 w-4 ml-1" />
                    <span className="ml-2">{fileNode.basename}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ReadOnlyFileTree
                    fileTreeDir={fileNode as TreeDir}
                    expanded={expanded}
                    onToggle={onToggle}
                    depth={depth + 1}
                    filter={filter}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : fileNode.isTreeFile() ? (
            <div className="pt-0.5">
              <SidebarMenuButton className="my-0.5 pl-8 w-full justify-start">
                <div className="w-4" />
                <FileIcon className="h-4 w-4 ml-1" />
                <span className="ml-2">{fileNode.basename}</span>
              </SidebarMenuButton>
            </div>
          ) : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
