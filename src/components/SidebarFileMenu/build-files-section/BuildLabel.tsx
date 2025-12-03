import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { BuildDAO } from "@/data/BuildDAO";
import { cn } from "@/lib/utils";
import { FolderOpenIcon } from "lucide-react";
import { timeAgo } from "short-time-ago";

export function BuildLabel({ build, className }: { build: BuildDAO; className?: string }) {
  return (
    <div className={cn("flex justify-start flex-col items-start gap-1 w-full whitespace-nowrap", className)}>
      <div className="w-full flex justify-center items-center gap-2">
        {/* <span className="rounded-full w-2 h-2 bg-primary flex-shrink-0"></span> */}
        <span className="w-3 h-3 rounded border flex-shrink-0 flex justify-center items-center">
          <WorkspaceIcon size={4} variant="round" input={build.guid} />
        </span>
        <span className="truncate w-full min-w-0 text-left">{build.label}</span>
      </div>
      <div className="text-xs text-muted-foreground truncate w-full flex justify-start items-center gap-2">
        <FolderOpenIcon size={12} className="flex-shrink-0" /> {`${build.fileCount} files & dirs`} •{" "}
        {timeAgo(new Date(build.timestamp))}
      </div>
    </div>
  );
}
