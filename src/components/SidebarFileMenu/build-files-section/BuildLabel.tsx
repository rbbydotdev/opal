import { BuildDAO } from "@/data/BuildDAO";
import { cn } from "@/lib/utils";
import { FolderOpenIcon } from "lucide-react";
import { timeAgo } from "short-time-ago";

export function BuildLabel({ build, className }: { build: BuildDAO; className?: string }) {
  return (
    <div className={cn("flex justify-start flex-col items-start gap-1 truncate", className)}>
      <div className="w-full flex justify-start items-center">{build.label}</div>
      <div className="text-xs text-muted-foreground truncate w-full flex justify-start items-center gap-2">
        <FolderOpenIcon size={12} /> {`${build.fileCount} files & dirs`} • {timeAgo(build.timestamp)}
      </div>
    </div>
  );
}
