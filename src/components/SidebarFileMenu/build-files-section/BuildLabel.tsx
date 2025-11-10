import { BuildDAO } from "@/data/BuildDAO";
import { cn } from "@/lib/utils";
import { timeAgo } from "short-time-ago";

export function BuildLabel({ build, className }: { build: BuildDAO; className?: string }) {
  return (
    <div className={cn("flex justify-start flex-col items-start gap-1 truncate", className)}>
      <div className="w-full flex justify-start items-center">{build.label}</div>
      <div className="text-2xs text-muted-foreground truncate w-full flex justify-start items-center">
        {build.Disk.guid} • {timeAgo(build.timestamp)}
      </div>
    </div>
  );
}
