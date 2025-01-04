import { TreeDir } from "@/clientdb/filetree";
import { EditableLink } from "@/components/EditableMenuItem";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

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
    <SidebarMenu>
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
                  <span className="group cursor-pointer" tabIndex={1}>
                    <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
                      <span className="mr-2">
                        <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
                        <ChevronRight size={18} className="group-data-[state=open]:hidden" />
                      </span>
                      <span>{file.name}</span>
                    </span>
                  </span>
                ) : (
                  <EditableLink
                    href={{ pathname: resolveFileUrl(file.path) }}
                    isSelected={currentFile === file.path}
                    depth={depth}
                  >
                    {file.name}
                  </EditableLink>
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
