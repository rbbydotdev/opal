import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { TreeDir } from "@/lib/files";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";

export function FileTreeMenu({
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
