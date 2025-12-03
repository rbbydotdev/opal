import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export const EmptySidebarLabel = ({ label: value = "empty", className }: { label?: string; className?: string }) => (
  <SidebarGroupLabel className={cn("text-center italic border-dashed border h-full", className)}>
    <div className="w-full ">
      <span className="text-3xs">{value}</span>
    </div>
  </SidebarGroupLabel>
);
