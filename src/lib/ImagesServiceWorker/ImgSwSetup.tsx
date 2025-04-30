import { Workspace } from "@/clientdb/Workspace";
import { RemoteObj } from "@/lib/ImagesServiceWorker/sw";
import * as Comlink from "comlink";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";
const SwLogger = (msg: string) => {
  console.log(
    "%cISW:%c %s",
    "background: purple; color: white; padding: 2px; border-radius: 3px;",
    "background: none; color: inherit;",
    msg
  );
};

async function unregisterServiceWorkers() {
  console.debug("Unregistering all service workers...");
  return navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((registration) =>
          registration
            .unregister()
            .then((success) => {
              if (success) {
                console.debug("Service Worker unregistered:", registration);
              } else {
                console.debug("Service Worker could not be unregistered:", registration);
              }
            })
            .catch((error) => {
              console.error("Error unregistering Service Worker:", error);
            })
        )
      )
    )
    .catch((error) => {
      console.error("Error getting Service Worker registrations:", error);
    });
}

export const ImgSw = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { workspaceId } = Workspace.parseWorkspacePath(pathname);
  const [swLoaded, setSwLoaded] = useState(false);

  useLayoutEffect(() => {
    if (!workspaceId) {
      console.log("No current workspace");
      return;
    }

    let unmountFn: ((arg0: string) => void) | undefined;

    void setupServiceWorkerAndComlink().then(async (comlink) => {
      if (comlink) {
        await comlink.registerLogger(Comlink.proxy(SwLogger));
        // await comlink.mountWorkspace(workspaceId);
        await new Promise((rs) => void comlink.mountWorkspace(workspaceId, Comlink.proxy(rs)));
        console.log("Mounted workspace");
        unmountFn = comlink.unmountWorkspace;
        setSwLoaded(true);
      }
    });

    return () => {
      if (unmountFn) unmountFn(workspaceId);
    };
  }, [workspaceId]);
  if (!swLoaded) {
    return null;
  } else {
    return children;
  }
};

export async function setupServiceWorkerAndComlink(): Promise<Comlink.Remote<RemoteObj> | undefined> {
  try {
    // Register the service worker if it's not controlling the page
    await unregisterServiceWorkers();
    if (!navigator.serviceWorker.controller) {
      console.warn("Service Worker is not controlling the page.");
      await navigator.serviceWorker.register(new URL("@/lib/ImagesServiceWorker/sw.ts", import.meta.url), {
        scope: "/",
        updateViaCache: "none",
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
    }

    // Listen for the controllerchange event to ensure the service worker is controlling the page
    return new Promise((resolve) => {
      if (navigator.serviceWorker.controller) {
        // If already controlled, initialize Comlink immediately
        resolve(initializeComlink());
      } else {
        // Otherwise, wait for the controllerchange event
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("Service Worker is now controlling the page.");
          resolve(initializeComlink());
        });
      }
    });
  } catch (error) {
    console.error("Error setting up Service Worker and Comlink:", error);
  }
}

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
