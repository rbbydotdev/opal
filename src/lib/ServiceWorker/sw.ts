import { Workspace } from "@/data/Workspace";
import { errF } from "@/lib/errors";
import { defaultFetchHandler } from "@/lib/ServiceWorker/handler";
import { hasRouteMatch, routeRequest } from "@/lib/ServiceWorker/router";
import { WHITELIST } from "@/lib/ServiceWorker/utils";

// EnableRemoteLogger();

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

  const whiteListMatch = WHITELIST.some((pattern) => pattern.test(url.pathname));
  // If there's no referrer, it's likely a direct navigation or non-app request.
  // Let the browser handle it directly.
  if ((request.mode === "navigate" || !request.referrer) && hasRouteMatch(event, "NAV")) {
    return event.respondWith(routeRequest(event));
  }
  if (!request.referrer || whiteListMatch || request.mode === "navigate" || event.request.destination === "script") {
    return event.respondWith(defaultFetchHandler(event));
  }

  try {
    let workspaceName =
      Workspace.parseWorkspacePathLegacy(request.referrer).workspaceName || url.searchParams.get("workspaceName");

    {
      const allHeaders: Record<string, string> = {};
      for (const [k, v] of event.request.headers.entries()) {
        allHeaders[k] = v;
      }
    }

    // Only handle requests originating from within our app and for a valid workspace
    if (workspaceName && url.origin === self.location.origin) {
      event.respondWith(routeRequest(event, workspaceName));
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
