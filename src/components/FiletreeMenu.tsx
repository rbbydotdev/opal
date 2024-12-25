import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { FileTree } from "@/shapes/workspace";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

export function FileTreeMenu({
  fileTreeChildren,
  depth = 0,
  expand,
  expanded,
}: {
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  fileTreeChildren?: FileTree["children"];
  depth?: number;
}) {
  if (!fileTreeChildren) return null;
  const isExpanded = (file: { path: string }) => {
    return !!(expanded && file.path && expanded[file.path]);
  };
  return (
    <SidebarMenu className="">
      {fileTreeChildren.map((file) => (
        <Collapsible
          key={file.name}
          open={isExpanded(file)}
          defaultOpen={isExpanded(file)}
          onOpenChange={(o) => expand(file.path, o)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton asChild>
                {file.type === "dir" ? (
                  <Link href={"#"} className="group">
                    <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
                      <span className="mr-2">
                        <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
                        <ChevronRight size={18} className="group-data-[state=open]:hidden" />
                      </span>
                      <span>{file.name}</span>
                    </span>
                  </Link>
                ) : (
                  <Link href={{ pathname: file.href, query: { sf: "1" } }} className="group">
                    <span style={{ marginLeft: depth * 1 + "rem" }}>
                      <span className="pl-3">{file.name}</span>
                    </span>
                  </Link>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
                <FileTreeMenu expand={expand} fileTreeChildren={file.children} depth={depth + 1} expanded={expanded} />
              ) : null}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      ))}
    </SidebarMenu>
  );
}
