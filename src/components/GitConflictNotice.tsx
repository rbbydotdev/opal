import { useFlashTooltip } from "@/components/SidebarFileMenu/main-files-section/useFlashTooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertTriangle, GitMergeIcon } from "lucide-react";

interface GitConflictNoticeProps {
  className?: string;
}

export function GitConflictNotice({ className }: GitConflictNoticeProps) {
  const [open, toggleOpen] = useFlashTooltip();
  return (
    <Tooltip open={open} onOpenChange={toggleOpen}>
      <TooltipTrigger asChild>
        <div
          onClick={toggleOpen}
          // title={"Git conflicts detected"}
          className={cn(
            "cursor-pointer inline-flex items-center justify-center h-full gap-1.5 px-2 py-1 rounded text-xs font-medium border border-destructive bg-destructive/10 text-destructive",
            className
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          <GitMergeIcon className="h-3 w-3" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-xs">
        <p>Git conflicts detected.</p>
      </TooltipContent>
    </Tooltip>
  );
}
