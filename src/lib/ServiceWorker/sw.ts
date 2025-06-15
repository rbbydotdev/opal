import Identicon from "@/components/Identicon";
import { Thumb } from "@/Db/Thumb";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { absPath, decodePath } from "@/lib/paths2";
import { RemoteLogger } from "@/lib/RemoteLogger";
import { handleDownloadRequest } from "@/lib/ServiceWorker/handleDownloadRequest";
import { handleDownloadRequestEncrypted } from "@/lib/ServiceWorker/handleDownloadRequestEncrypted";
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";
import React from "react";
import { renderToString } from "react-dom/server";

const WHITELIST = ["/opal.svg", "/favicon.ico", "/icon.svg", "/opal-lite.svg"];

declare const self: ServiceWorkerGlobalScope;

function formatConsoleMsg(msg: unknown): string {
  if (msg instanceof Error) {
    return `${msg.name}: ${msg.message}\n${msg.stack ?? ""}`;
  }
  if (typeof msg === "object") {
    try {
      return JSON.stringify(msg, null, 2);
    } catch {
      return String(msg);
    }
  }
  return String(msg);
}

const RL = RemoteLogger("ServiceWorker");
console.log = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "log");
};
console.debug = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "debug");
};
console.error = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "error");
};
console.warn = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "warn");
};

// --- Service Worker Installation and Activation ---

self.addEventListener("activate", function (event) {
  return event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  return event.waitUntil(self.skipWaiting());
});

// --- Request Signaling Helper Functions ---

export function signalRequest(detail: RequestEventDetail) {
  void self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(detail);
    });
  });
}

function withRequestSignal<T extends (...args: never[]) => Promise<Response>>(handler: T) {
  return async function (...args: Parameters<T>): Promise<Response> {
    signalRequest({ type: REQ_SIGNAL.START });
    try {
      const result = await handler(...args);
      return result;
    } finally {
      signalRequest({ type: REQ_SIGNAL.END });
    }
  };
}

// --- Fetch Event Listener ---

self.addEventListener("fetch", async (event) => {
  // If no referrer, just fetch the request
  if (!event.request.referrer) {
    return event.respondWith(withRequestSignal(fetch)(event.request));
  }
  const url = new URL(event.request.url);
  let referrerPath = "";
  try {
    referrerPath = new URL(event.request.referrer).pathname;
  } catch (e) {
    console.error(`Error parsing referrer: ${event.request.referrer}, ${e}`);
    throw new NotFoundError(`Error parsing referrer ${event.request.referrer}`);
  }
  let workspaceId = null;
  try {
    workspaceId = Workspace.parseWorkspacePath(referrerPath).workspaceId;
  } catch (e) {
    console.error(errF`Error parsing workspaceId from referrer: ${referrerPath}, ${e}`.toString());
  }
  try {
    if (workspaceId && url.origin === self.location.origin) {
      if (url.pathname === "/download-encrypted.zip") {
        console.log(`Fetch event for: ${event.request.url}, referrer: ${event.request.referrer}`);
        return event.respondWith(handleDownloadRequestEncrypted(workspaceId, event));
      }
      if (url.pathname === "/download.zip") {
        return event.respondWith(handleDownloadRequest(workspaceId));
      }
      if (url.pathname === "/favicon.svg" || url.pathname === "/icon.svg") {
        return event.respondWith(withRequestSignal(handleFaviconRequest)(event));
      }
      if ((event.request.destination === "image" || isImageType(url.pathname)) && !WHITELIST.includes(url.pathname)) {
        return event.respondWith(withRequestSignal(handleImageRequest)(event, url, workspaceId));
      }
    }
  } catch (e) {
    // const stack = e && typeof e === "object" && "stack" in e ? String((e as Error).stack) : String(e);
    console.error(errF`Error handling fetch event: ${event.request.url}, ${e}`.toString());
  }

  return event.respondWith(withRequestSignal(fetch)(event.request));
});

export const SWWStore = new (class SwWorkspace {
  constructor() {
    console.log("SWWStore initialized");
  }
  private workspace: Promise<Workspace> | null = null;

  async tryWorkspace(workspaceId: string): Promise<Workspace> {
    if (this.workspace instanceof Promise) {
      console.log("awaiting workspace promise...");
      const ws = await this.workspace;
      if (ws.name !== workspaceId) {
        await ws.tearDown();
        this.workspace = null;
      } else {
        console.log(`Returning existing workspace: ${ws.name}`);
        return ws;
      }
    }
    return (this.workspace = WorkspaceDAO.FetchByName(workspaceId).then((wsd) => wsd.toModel()));
  }
})();

async function handleFaviconRequest(event: FetchEvent): Promise<Response> {
  const referrerPath = new URL(event.request.referrer).pathname;
  Workspace.parseWorkspacePath(referrerPath);
  const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
  if (!workspaceId) {
    return fetch(event.request);
  }
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  return new Response(
    renderToString(
      React.createElement(Identicon, {
        input: workspace.guid,
        size: 4,
      })
    ),
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

async function handleImageRequest(event: FetchEvent, url: URL, workspaceId: string): Promise<Response> {
  try {
    const decodedPathname = decodePath(url.pathname);
    const isThumbnail = Thumb.isThumbURL(url);
    console.log(`Intercepted request for: 
    decodedPathname: ${decodedPathname}
    url.pathname: ${url.pathname}
    href: ${url.href}
    isThumbnail: ${isThumbnail}
  `);
    let cache: Cache;
    if (!decodedPathname.endsWith(".svg")) {
      cache = await Workspace.newCache(workspaceId).getCache();
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        console.log(`Cache hit for: ${url.href.replace(url.origin, "")}`);
        return cachedResponse;
      }
    }
    console.log(`Cache miss for: ${url.href.replace(url.origin, "")}, fetching from workspace`);
    const workspace = await SWWStore.tryWorkspace(workspaceId);

    if (!workspace) throw new Error("Workspace not found " + workspaceId);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    const contents = isThumbnail
      ? await workspace.readOrMakeThumb(decodedPathname)
      : await workspace.readFile(absPath(decodedPathname));

    const response = new Response(coerceUint8Array(contents) as BodyInit, {
      headers: {
        "Content-Type": getMimeType(decodedPathname),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    if (!decodedPathname.endsWith(".svg")) {
      await cache!.put(event.request, response.clone());
    }
    return response;
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
