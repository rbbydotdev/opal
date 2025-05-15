import { ChevronDown, ChevronRight } from "lucide-react";
import { twMerge } from "tailwind-merge";

export const OpenedChevron = ({ className }: { className?: string }) => (
  <ChevronDown size={14} className={twMerge("group-data-[state=closed]:hidden -ml-0.5", className)} />
);
export const ClosedChevron = ({ className }: { className?: string }) => (
  <ChevronRight size={14} className={twMerge("group-data-[state=open]:hidden -ml-0.5", className)} />
);
