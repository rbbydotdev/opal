import { TreeDir } from "@/clientdb/filetree";
import { EditableDir } from "@/components/EditableDir";
import { EditableFile } from "@/components/EditableFile";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";

export function FileTreeMenu({
  fileTree,
  resolveFileUrl,
  depth = 0,
  expand,
  currentFile,
  onDirRename,
  onFileRename: onFileRename,
  expanded,
}: {
  resolveFileUrl: (path: string) => string;
  expand: (s: string, b: boolean) => void;
  expanded: { [path: string]: boolean };
  currentFile: string | null;
  fileTree: TreeDir["children"];
  onDirRename: (dirPath: string, newBaseName: string) => Promise<string> | string;
  onFileRename: (filePath: string, newBaseName: string) => Promise<string> | string;
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
                  <EditableDir depth={depth} onRename={(newBasename) => onDirRename(file.path, newBasename)}>
                    {file.name}
                  </EditableDir>
                ) : (
                  // <span className="group cursor-pointer">
                  //   <span className="inline-flex" style={{ marginLeft: depth * 1 + "rem" }}>
                  //     <span className="mr-2">
                  //       <ChevronDown size={18} className="group-data-[state=closed]:hidden" />
                  //       <ChevronRight size={18} className="group-data-[state=open]:hidden" />
                  //     </span>
                  //     <span>{file.name}</span>
                  //   </span>
                  // </span>
                  <EditableFile
                    href={resolveFileUrl(file.path)}
                    isSelected={currentFile === file.path}
                    depth={depth}
                    onRename={(newBasename) => onFileRename(file.path, newBasename)}
                  >
                    {file.name}
                  </EditableFile>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {file.type === "dir" ? (
                <FileTreeMenu
                  expand={expand}
                  onFileRename={onFileRename}
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
