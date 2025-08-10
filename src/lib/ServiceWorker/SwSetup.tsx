// import { useLocation } from "@tanstack/react-router";
import { useLayoutEffect, useState } from "react";

//will delay the loading of the page until the service worker is ready
export const ServiceWorker = ({ children }: { children: React.ReactNode }) => {
  // const pathname = usePathname();
  // const { workspaceId } = Workspace.parseWorkspacePath(pathname);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    // if (!workspaceId) {
    //   console.log("No current workspace");
    //   return;
    // }
    void setupServiceWorker().then(() => setReady(true));
  }, []);
  if (ready) return children;
  return null;
};

export async function setupServiceWorker(): Promise<void> {
  try {
    // Register the service worker if it's not controlling the page
    // await unregisterServiceWorkers();
    if (!navigator.serviceWorker.controller) {
      console.warn("Service Worker is not controlling the page.");
      await navigator.serviceWorker.register(new URL("@/lib/ServiceWorker/sw.ts", import.meta.url), {
        scope: "/",
        updateViaCache: "none",
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("service worker ready");
    }
  } catch (error) {
    console.error("Error setting up Service Worker and Comlink:", error);
    if (process.env.NODE_ENV !== "development") {
      throw error;
    }
  }
}
/*
async function initializeComlink() {
  if (!navigator.serviceWorker.controller) {
    console.warn("Service Worker is not controlling the page.");
    return;
  }

  const { port1, port2 } = new MessageChannel();
  const msg = {
    comlinkInit: true,
    port: port1,
  };

  navigator.serviceWorker.controller.postMessage(msg, [port1]);

  return Comlink.wrap<RemoteObj>(port2);
}


// Service Worker Installation and Activation
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
*/
