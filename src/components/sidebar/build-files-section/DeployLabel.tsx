import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, X } from "lucide-react";

export function DeployLabel({ deploy, className }: { deploy: DeployDAO; className?: string }) {
  const action = {
    success: "Successfully Published",
    failed: "Failed Publishing",
    cancelled: "Cancelled Publishing",
    pending: "",
    idle: "",
  }[deploy.status];
  return (
    <div className={cn(className, "flex flex-col items-start gap-1 w-full")}>
      <span className="font-medium capitalize whitespace-nowrap w-full gap-1 flex items-center justify-start">
        {deploy.isSuccessful && <CheckCircleIcon className="text-green-500 w-4 h-4" />}
        {!deploy.isSuccessful && <X className="w-4 h-4 text-destructive rounded-full border-destructive border-2" />}
        <RemoteAuthSourceIconComponent source={deploy.provider} />
        <span className="truncate min-w-0 items-center">{deploy.label}</span>
      </span>
      <span className="text-xs text-muted-foreground capitalize">
        {action} to {deploy.provider}
      </span>
    </div>
  );
}
