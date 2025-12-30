import { cn } from "@/lib/utils";

export function PingDot({ type = "default" }: { type?: "success" | "error" | "warning" | "info" | "default" } = {}) {
  return (
    <span
      className={cn("block rounded-full w-2 h-2", {
        "bg-success": type === "success",
        "bg-destructive": type === "error",
        "bg-chart-1": type === "warning",
        "bg-chart-2": type === "info",
        "bg-chart-3": type === "default",
      })}
    >
      <span
        className={cn("block w-2 h-2 animate-ping rounded-full", {
          "bg-success": type === "success",
          "bg-destructive": type === "error",
          "bg-chart-1": type === "warning",
          "bg-chart-2": type === "info",
          "bg-chart-3": type === "default",
        })}
      ></span>
    </span>
  );
}
