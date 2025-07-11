import { SidebarGroupLabel } from "@/components/ui/sidebar";

export const EmptySidebarLabel = ({ label: value = "empty" }: { label?: string }) => (
  <SidebarGroupLabel className="text-center italic border-dashed border h-full ">
    <div className="w-full ">
      <span className="text-3xs">{value}</span>
    </div>
  </SidebarGroupLabel>
);
