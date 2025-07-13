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
        <SidebarTreeViewActions setExpandAll={setExpandAll} />
      </SidebarGroupContent>
    </SidebarTreeView>
  );
}
