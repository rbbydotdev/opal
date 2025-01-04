import { TreeDir } from "@/clientdb/filetree";
import { EditableLink } from "@/components/EditableLink";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

export function FileTreeMenu({
  fileTree,
  resolveFileUrl,
  depth = 0,
  expand,
  currentFile,
  onRename,
  expanded,
}: {
  resolveFileUrl: (path: string) => string;
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  currentFile: string | null;
  fileTree: TreeDir["children"];
  onRename: (filePath: string, newBaseName: string) => Promise<string>;
  depth?: number;
}) {
  return (
    <SidebarMenu>
      {fileTree.map((file) => (
        <Collapsible
          key={file.path}
          open={expanded[file.path]}
          defaultOpen={expanded[file.path]}
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
                  <EditableLink
                    href={{ pathname: resolveFileUrl(file.path) }}
                    isSelected={currentFile === file.path}
                    depth={depth}
                    onRename={(newBasename) => onRename(file.path, newBasename)}
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
                  onRename={onRename}
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
