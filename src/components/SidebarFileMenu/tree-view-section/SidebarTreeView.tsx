import { SidebarGripChevron } from "@/components/SidebarFileMenu/publish-section/SidebarGripChevron";
import { SidebarTreeViewMenu } from "@/components/TreeMenu";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenuButton } from "@/components/ui/sidebar";
import { useSingleItemExpander } from "@/features/tree-expander/useSingleItemExpander";
import clsx from "clsx";
import { CopyMinus, ListTree } from "lucide-react";

export function SidebarTreeView({
  className,
  children,
  ...props
}: {
  className?: string;
} & React.ComponentProps<typeof SidebarGroup>) {
  const [groupExpanded, groupSetExpand] = useSingleItemExpander("SidebarTreeMenu");

  return (
    <SidebarGroup className={clsx("pl-0 pb-12 py-0 pr-0 w-full ", className)} {...props}>
      <Collapsible
        className="group/collapsible flex flex-col min-h-0"
        open={groupExpanded}
        onOpenChange={groupSetExpand}
      >
        <SidebarGroupLabel className="pl-0 relative w-full pr-0 overflow-x-hidden">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="peer">
              <SidebarGroupLabel>
                <SidebarGripChevron />
                <div className="w-full">
                  <div className="flex justify-center items-center">
                    <ListTree size={14} className="mr-2" />
                    Tree View
                  </div>
                </div>
              </SidebarGroupLabel>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <div className="peer-hover:bg-sidebar-accent  h-full flex items-center rounded-none">{children}</div>
        </SidebarGroupLabel>

        <CollapsibleContent className="min-h-0 flex-shrink">
          <SidebarContent className="overflow-y-auto h-full scrollbar-thin p-0 pb-2 pl-4 max-w-full overflow-x-hidden border-l-2 pr-5 group">
            <SidebarTreeViewMenu />
          </SidebarContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export const SidebarTreeViewActions = ({ setExpandAll }: { setExpandAll: (expand: boolean) => void }) => (
  <div className="whitespace-nowrap">
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
