import { TreeDir } from "@/clientdb/filetree";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

export function File({ selected, children }: { selected: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex gap-2">
      {selected && <span className="text-purple-700 ">✦</span>}
      {children}
    </span>
  );
}
export function FileTreeMenu({
  fileTree,
  resolveFileUrl,
  depth = 0,
  expand,
  currentFile,
  expanded,
}: {
  resolveFileUrl: (path: string) => string;
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  currentFile: string | null;
  fileTree?: TreeDir["children"];
  depth?: number;
}) {
  if (!fileTree) return null;
  const isExpanded = (file: { path: string }) => {
    return !!(expanded && file.path && expanded[file.path]);
  };
  return (
    <SidebarMenu className="">
      {fileTree.map((file) => (
        <Collapsible
          key={file.name}
          open={isExpanded(file)}
          defaultOpen={isExpanded(file)}
          onOpenChange={(o) => expand(file.path, o)}
        >
          <SidebarMenuItem className={currentFile === file.path ? "bg-sidebar-accent" : ""}>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton asChild>
                {file.type === "dir" ? (
                  <span className="group cursor-pointer">
                    <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
                      <span className="mr-2">
                        <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
                        <ChevronRight size={18} className="group-data-[state=open]:hidden" />
                      </span>
                      <span>{file.name}</span>
                    </span>
                  </span>
                ) : (
                  <Link href={{ pathname: resolveFileUrl(file.path) }} className="group">
                    <span style={{ marginLeft: depth * 1 + "rem" }}>
                      <span className="pl-3">
                        <File selected={currentFile === file.path}>{file.name}</File>
                      </span>
                    </span>
                  </Link>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
                <FileTreeMenu
                  expand={expand}
                  fileTree={file.children}
                  depth={depth + 1}
                  currentFile={currentFile}
                  expanded={expanded}
                  resolveFileUrl={resolveFileUrl}
                />
              ) : null}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      ))}
    </SidebarMenu>
  );
}
