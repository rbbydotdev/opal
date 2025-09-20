import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConflictBannerProps {
  className?: string;
}

export function ConflictBanner({ className }: ConflictBannerProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border border-destructive bg-destructive/10 text-destructive", className)}>
      <AlertTriangle className="h-3 w-3" />
      <span>Git conflicts detected</span>
    </div>
  );
}