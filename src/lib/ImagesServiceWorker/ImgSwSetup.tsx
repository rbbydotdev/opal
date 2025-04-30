import { Workspace } from "@/clientdb/Workspace";
import { RemoteObj } from "@/lib/ImagesServiceWorker/sw";
import * as Comlink from "comlink";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";

export const ImgSw = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { workspaceId } = Workspace.parseWorkspacePath(pathname);
  const [resolved, setResolved] = useState(false);

  useLayoutEffect(() => {
    if (!workspaceId) {
      console.log("No current workspace");
      return;
    }

    let unmountFn: ((arg0: string) => void) | undefined;

    void setupServiceWorkerAndComlink().then(async (comlink) => {
      if (comlink) {
        await comlink.registerLogger(
          Comlink.proxy((msg: string) => {
            console.log(
              "%cISW:%c %s",
              "background: purple; color: white; padding: 2px; border-radius: 3px;",
              "background: none; color: inherit;",
              msg
            );
          })
        );
        await comlink.mountWorkspace(workspaceId);
        // await new Promise((rs) => void comlink.mountWorkspace(workspaceId, Comlink.proxy(rs)));
        console.log("Mounted workspace");
        unmountFn = comlink.unmountWorkspace;
        setResolved(true);
      }
    });

    return () => {
      if (unmountFn) unmountFn(workspaceId);
    };
  }, [workspaceId, setResolved]);

  if (!resolved) {
    // if (false) {
    return null;
  } else {
    return <>{children}</>;
  }
  // return <>{children}</>;
};

export async function setupServiceWorkerAndComlink() {
  try {
    if (!navigator.serviceWorker.controller) {
      console.warn("Service Worker is not controlling the page.");
      await navigator.serviceWorker.register(new URL("@/lib/ImagesServiceWorker/sw.ts", import.meta.url), {
        scope: "/",
        updateViaCache: "none",
        // updateViaCache: process.env.NODE_ENV === 'development' ? 'none' : 'all'
      });
      await navigator.serviceWorker.ready;
    }

    return initializeComlink();
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
