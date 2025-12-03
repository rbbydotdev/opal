import { toast } from "@/components/ui/sonner";
import React, { useCallback, useEffect } from "react";

export const AsyncWindowErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const promiseRejectionHandler = useCallback((event: PromiseRejectionEvent) => {
    const error = event.reason;

    console.error("Unhandled promise rejection:", error);

    const errorMessage =
      error instanceof Error ? error.message : typeof error === "string" ? error : "An unexpected error occurred";

    toast({
      title: "Something went wrong",
      description: (
        <div className="space-y-1">
          <div className="font-bold truncate w-full">{errorMessage}</div>
          <div className="text-xs text-muted-foreground font-mono">Check console for details</div>
        </div>
      ),
      type: "error",
      position: "top-right",
    });
  }, []);

  useEffect(() => {
    window.addEventListener("unhandledrejection", promiseRejectionHandler);

    return () => {
      window.removeEventListener("unhandledrejection", promiseRejectionHandler);
    };
  }, [promiseRejectionHandler]);

  return <>{children}</>;
};
