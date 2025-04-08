import { Workspace } from "@/clientdb/Workspace";
import { useWorkerContext } from "@/components/SWImages";
import { RemoteObj } from "@/lib/ImagesServiceWorker/sw";
import * as Comlink from "comlink";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const ImgSw = () => {
  const pathname = usePathname();
  const { workspaceId } = Workspace.parseWorkspacePath(pathname);
  const { currentWorkspace } = useWorkerContext();

  useEffect(() => {
    if (!workspaceId) {
      console.log("No current workspace");
      return;
    }

    let unmountFn: ((arg0: string) => void) | undefined;

    setupServiceWorkerAndComlink().then(async (comlink) => {
      if (comlink) {
        await comlink.mountWorkspace(workspaceId);
        console.log("Mounted workspace");
        unmountFn = comlink.unmountWorkspace;
      }
    });

    return () => {
      if (unmountFn) unmountFn(workspaceId);
    };
  }, [workspaceId]);

  return null;
};

export async function setupServiceWorkerAndComlink() {
  try {
    if (!navigator.serviceWorker.controller) {
      console.warn("Service Worker is not controlling the page.");
      await navigator.serviceWorker.register(new URL("@/lib/ImagesServiceWorker/sw.ts", import.meta.url), {
        scope: "/",
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
