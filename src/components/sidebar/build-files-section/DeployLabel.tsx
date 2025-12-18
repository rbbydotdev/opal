import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { cn } from "@/lib/utils";
import { ArrowUpRightIcon, CheckCircleIcon, X } from "lucide-react";

export function DeployLabel({ deploy, className }: { deploy: DeployDAO; className?: string }) {
  const action = {
    success: "Successfully Published",
    failed: "Failed Publishing",
    cancelled: "Cancelled Publishing",
    pending: "",
    idle: "",
  }[deploy.status];

  const deploymentUrl = deploy.effectiveUrl;

  return (
    <div className={cn(className, "flex flex-col items-start gap-1 w-full")}>
      <span className="font-medium capitalize whitespace-nowrap w-full gap-1 flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          {deploy.isSuccessful && <CheckCircleIcon className="text-green-500 w-4 h-4 shrink-0" />}
          {!deploy.isSuccessful && <X className="w-4 h-4 text-destructive rounded-full border-destructive border-2 shrink-0" />}
          <RemoteAuthSourceIconComponent source={deploy.provider} />
          <span className="truncate min-w-0">{deploy.label}</span>
        </div>
        {deploy.isSuccessful && deploymentUrl && (
          <a
            href={deploymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded"
            onClick={(e) => e.stopPropagation()}
            title="Open deployment"
          >
            <ArrowUpRightIcon className="w-3 h-3" />
          </a>
        )}
      </span>
      <span className="text-xs text-muted-foreground capitalize">
        {action} to {deploy.provider}
      </span>
    </div>
  );
}
