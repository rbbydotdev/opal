import { SidebarMdastTreeMenu } from "@/components/MdastTreeMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { useSingleItemExpander } from "@/features/filetree-expander/useSingleItemExpander";
import { ChevronRight, LucideGitBranch } from "lucide-react";
import { useCurrentFilepath } from "../../context/WorkspaceHooks";

export function SidebarTreeView(props: React.ComponentProps<typeof SidebarGroup>) {
  const [expanded, setExpand] = useSingleItemExpander("export");
  const { workspace } = useWorkspaceContext();
  const { filePath, isMarkdown } = useCurrentFilepath();
  return (
    <SidebarGroup {...props}>
      <Collapsible className="group/collapsible" open={expanded} onOpenChange={setExpand}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
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

        <CollapsibleContent>
          <div className="px-4 pt-2 py-4 flex flex-col gap-2">
            <SidebarMdastTreeMenu />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
