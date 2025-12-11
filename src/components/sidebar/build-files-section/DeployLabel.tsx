import { DeployDAO } from "@/data/dao/DeployDAO";
import { cn } from "@/lib/utils";

export function DeployLabel({ deploy, className }: { deploy: DeployDAO; className?: string }) {
  return (
    <div className={cn(className, "flex flex-col items-start gap-1 w-full")}>
      <span className="font-medium capitalize whitespace-nowrap w-full gap-1 flex items-center justify-start">
        {"i"}
        <span className="truncate min-w-0 items-center">{deploy.label}</span>
      </span>
      <span className="text-xs text-muted-foreground capitalize">Published to {deploy.label}</span>
    </div>
  );
}
