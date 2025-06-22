import { Workspace } from "@/Db/Workspace";
import { errF, NotFoundError } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { RemoteLogger } from "@/lib/RemoteLogger";
import { handleDownloadRequest } from "@/lib/ServiceWorker/handleDownloadRequest";
import { handleDownloadRequestEncrypted } from "@/lib/ServiceWorker/handleDownloadRequestEncrypted";
import { handleFaviconRequest } from "@/lib/ServiceWorker/handleFaviconRequest";
import { handleImageRequest } from "@/lib/ServiceWorker/handleImageRequest";
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";

const WHITELIST = ["/opal.svg", "/opal-blank.svg", "/favicon.ico", "/icon.svg", "/opal-lite.svg"];

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
    console.error(errF`Error handling fetch event: ${event.request.url}, ${e}`.toString());
  }

  return event.respondWith(withRequestSignal(fetch)(event.request));
});
