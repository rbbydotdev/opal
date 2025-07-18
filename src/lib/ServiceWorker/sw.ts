import { Workspace } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { defaultFetchHandler } from "@/lib/ServiceWorker/handler";
import { routeRequest } from "@/lib/ServiceWorker/router";
import { WHITELIST } from "@/lib/ServiceWorker/utils";

declare const self: ServiceWorkerGlobalScope;

// --- Service Worker Lifecycle ---

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

// --- Main Fetch Controller ---

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);
  //log every request
  console.log(`Service Worker: Fetching ${url.pathname} with method ${request.method}. Referrer: ${request.referrer}`);

  const whiteListMatch = WHITELIST.some((pattern) => pattern.test(url.pathname));
  // If there's no referrer, it's likely a direct navigation or non-app request.
  // Let the browser handle it directly.
  if (!request.referrer || whiteListMatch) {
    return event.respondWith(defaultFetchHandler(event));
  }

  try {
    // const referrerPath = new URL(request.referrer).pathname;
    const workspaceId = Workspace.parseWorkspacePath(request.referrer).workspaceId;

    // Only handle requests originating from within our app and for a valid workspace
    if (workspaceId && url.origin === self.location.origin) {
      event.respondWith(routeRequest(event, workspaceId));
    } else {
      event.respondWith(defaultFetchHandler(event));
    }
  } catch (e) {
    console.error(
      errF`Error in fetch controller: ${request.url}. Referrer: ${request.referrer}. Error: ${e}`.toString()
    );
    // If we can't parse the workspace or another error occurs, fallback to network.
    event.respondWith(defaultFetchHandler(event));
  }
});
