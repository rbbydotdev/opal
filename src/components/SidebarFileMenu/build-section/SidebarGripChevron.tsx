import { ChevronRight, GripVertical } from "lucide-react";

export const SidebarGripChevron = () => (
  <div className="flex items-center">
    <GripVertical size={12} className="mr-0 cursor-grab opacity-50 w-4" />
    <ChevronRight
      size={14}
      className={
        "transition-transform duration-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=closed]/collapsible:rotate-0 -ml-1"
      }
    />
  </div>
);
