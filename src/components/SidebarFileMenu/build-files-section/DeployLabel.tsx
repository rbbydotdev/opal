import { DeployDAO } from "@/data/DAO/DeployDAO";
import { cn } from "@/lib/utils";

export function DeployLabel({ deploy, className }: { deploy: DeployDAO; className?: string }) {
  return (
    <div className={cn(className, "flex flex-col items-start gap-1 w-full")}>
      <span className="font-medium capitalize whitespace-nowrap w-full gap-1 flex items-center justify-start">
        {"i"}
        <span className="truncate min-w-0 items-center">
          {deploy.label} - <span>{deploy.destinationName}</span> / <span> {deploy.destinationType}</span>
        </span>
      </span>
      <span className="text-xs text-muted-foreground capitalize">Published to {deploy.destinationName} hosting</span>
    </div>
  );
}
