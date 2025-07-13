import {
  SidebarTreeView,
  SidebarTreeViewActions,
} from "@/components/SidebarFileMenu/tree-view-section/SidebarTreeView";
import { SidebarGroupContent } from "@/components/ui/sidebar";
import { useTreeExpanderContext } from "@/features/tree-expander/useTreeExpander";

export function SidebarMenuTreeSection() {
  const { setExpandAll } = useTreeExpanderContext();
  return (
    <SidebarTreeView>
      <SidebarGroupContent className="flex items-center">
        <span className="block group-data-[state=closed]/collapsible:hidden">
          <SidebarTreeViewActions setExpandAll={setExpandAll} />
        </span>
      </SidebarGroupContent>
    </SidebarTreeView>
  );
}
