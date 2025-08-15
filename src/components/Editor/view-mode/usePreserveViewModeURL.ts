import { Workspace } from "@/Db/Workspace";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
export function usePreserveViewModeURL() {
  const router = useRouter();
  useEffect(() => {
    return router.subscribe("onLoad", (event) => {
      const { workspaceName: toWorkspaceName } = Workspace.parseWorkspacePath(window.location.href);
      const { workspaceName: fromWorkspaceName } = Workspace.parseWorkspacePath(event?.fromLocation?.href || "");
      if (event?.fromLocation?.hash && !window.location.hash && toWorkspaceName === fromWorkspaceName) {
        window.location.hash = event?.fromLocation?.hash;
      }
    });
  }, [router]);
}
