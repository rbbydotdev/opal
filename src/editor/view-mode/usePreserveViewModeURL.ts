import { Workspace } from "@/lib/events/Workspace";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
export function usePreserveViewModeURL() {
  const router = useRouter();
  useEffect(() => {
    return router.subscribe("onLoad", (event) => {
      const { workspaceName: toWorkspaceName } = Workspace.parseWorkspacePath(window.location.href);
      const { workspaceName: fromWorkspaceName } = Workspace.parseWorkspacePath(event?.fromLocation?.href || "");
      if (event?.fromLocation?.hash && !window.location.hash && toWorkspaceName === fromWorkspaceName) {
        // Only preserve viewMode parameter, not hlRanges
        const fromHashParams = new URLSearchParams(event.fromLocation.hash.slice(1));
        const viewModeParam = fromHashParams.get("viewMode");
        if (viewModeParam) {
          const newHashParams = new URLSearchParams();
          newHashParams.set("viewMode", viewModeParam);
          window.location.hash = newHashParams.toString();
        }
      }
    });
  }, [router]);
}
