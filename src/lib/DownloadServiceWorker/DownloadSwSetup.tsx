import { Workspace } from "@/Db/Workspace";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";

//will delay the loading of the page until the service worker is ready
export const DownloadSw = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { workspaceId } = Workspace.parseWorkspacePath(pathname);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!workspaceId) {
      console.log("No current workspace");
      return;
    }
    void setupServiceWorker().then(() => setReady(true));
  }, [workspaceId]);
  if (ready) return children;
  return null;
};

export async function setupServiceWorker(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasDownloadSw = registrations.some((reg) => reg.active?.scriptURL.includes("download.sw"));
    if (!hasDownloadSw) {
      console.warn("Service Worker is not controlling the page.");
      await navigator.serviceWorker.register(new URL("@/lib/DownloadServiceWorker/download.sw.ts", import.meta.url), {
        scope: "/download",
        updateViaCache: "none",
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("download service worker ready");
    }
  } catch (error) {
    console.error("Error setting up Service Worker and Comlink:", error);
    throw error;
  }
}
