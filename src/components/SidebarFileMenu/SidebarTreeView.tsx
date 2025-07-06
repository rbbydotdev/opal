import { SidebarTreeViewMenu } from "@/components/MdastTreeMenu";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import clsx from "clsx";
import { ChevronRight, CopyMinus, FilePlus, FolderPlus, LucideGitBranch, Trash2 } from "lucide-react";

export function SidebarTreeView({
  className,
  children,
  ...props
}: {
  className?: string;
} & React.ComponentProps<typeof SidebarGroup>) {
  const [groupExpanded, groupSetExpand] = useSingleItemExpander("SidebarTreeMenu");
  return (
    <SidebarGroup className={clsx("pl-0 pb-12 py-0 pr-0 w-full bg-blue-200", className)} {...props}>
      <Collapsible
        className="group/collapsible flex flex-col min-h-0"
        open={groupExpanded}
        onOpenChange={groupSetExpand}
      >
        <SidebarGroupLabel className="pl-0 relative w-full pr-0 overflow-x-hidden">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="peer">
              <SidebarGroupLabel>
                <div className="flex items-center">
                  <ChevronRight
                    size={14}
                    className={
                      "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-0.5"
                    }
                  />
                </div>
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <LucideGitBranch size={14} className="mr-2" />
                    Tree View
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <div className="peer-hover:bg-sidebar-accent  h-full flex items-center rounded-none">{children}</div>
        </SidebarGroupLabel>

        <CollapsibleContent className="min-h-0 flex-shrink">
          <SidebarContent className="bg-green-400  overflow-y-auto h-full scrollbar-thin p-0 pb-2 pl-4 max-w-full overflow-x-hidden border-l-2 pr-5 group">
            <SidebarTreeViewMenu />
          </SidebarContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export const SidebarTreeViewActions = ({
  trashSelectedFiles,
  addFile,
  addDir,
  setExpandAll,
}: {
  trashSelectedFiles: () => void;
  addFile: () => void;
  addDir: () => void;
  setExpandAll: (expand: boolean) => void;
}) => (
  <div className="whitespace-nowrap">
    <Button
      onClick={trashSelectedFiles}
      className="p-1 m-0 h-fit"
      variant="ghost"
      aria-label="Trash Files"
      title="Trash Files"
    >
      <Trash2 />
    </Button>
    <Button onClick={addFile} className="p-1 m-0 h-fit" variant="ghost" aria-label="Add File" title="New File">
      <FilePlus />
    </Button>
    <Button onClick={addDir} className="p-1 m-0 h-fit" variant="ghost" aria-label="Add Folder" title="New Folder">
      <FolderPlus />
    </Button>
    <Button
      aria-label="Expand All"
      onDoubleClick={() => setExpandAll(true)}
      onClick={() => setExpandAll(false)}
      className="p-1 m-0 h-fit"
      variant="ghost"
      title="Collapse All"
    >
      <CopyMinus />
    </Button>
  </div>
);
