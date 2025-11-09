import { Workspace } from "@/data/Workspace";
import { errF } from "@/lib/errors";
import { defaultFetchHandler } from "@/lib/ServiceWorker/handler";
import { hasRouteMatch, routeRequest } from "@/lib/ServiceWorker/router";
import { EnableRemoteLogger, WHITELIST } from "@/lib/ServiceWorker/utils";

EnableRemoteLogger();

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

  const whiteListMatch = WHITELIST.some((item) => item.test(url, request));
  // If there's no referrer, it's likely a direct navigation or non-app request.
  // Let the browser handle it directly.
  if ((request.mode === "navigate" || !request.referrer) && hasRouteMatch(event, "NAV")) {
    return event.respondWith(routeRequest(event, null, "NAV"));
  }
  if (!request.referrer || whiteListMatch || request.mode === "navigate" || event.request.destination === "script") {
    return event.respondWith(defaultFetchHandler(event));
  }

  try {
    let workspaceName: string | null = null;

    // First, try to get workspace name from search params
    const searchParams = url.searchParams;
    if (searchParams.has('workspaceName')) {
      workspaceName = searchParams.get('workspaceName');
    }

    // If no workspace name in search params and we have a referrer, check referrer search params
    if (!workspaceName && request.referrer) {
      try {
        const referrerUrl = new URL(request.referrer);
        const referrerSearchParams = referrerUrl.searchParams;
        if (referrerSearchParams.has('workspaceName')) {
          workspaceName = referrerSearchParams.get('workspaceName');
        }
      } catch {
        // If parsing referrer URL fails, ignore
      }
    }

    // If no workspace name in search params, try to get it from the request URL itself
    if (!workspaceName) {
      try {
        const urlResult = Workspace.parseWorkspacePathLegacy(request.url);
        workspaceName = urlResult.workspaceName;
      } catch {
        // If parsing URL fails, ignore and try referrer
      }
    }

    // If no workspace name found and we have a referrer, try parsing that
    if (!workspaceName && request.referrer) {
      try {
        const referrerResult = Workspace.parseWorkspacePathLegacy(request.referrer);
        workspaceName = referrerResult.workspaceName;
      } catch {
        // If parsing referrer fails, continue with null workspaceName
      }
    }

    const allHeaders: Record<string, string> = {};
    for (const [k, v] of event.request.headers.entries()) {
      allHeaders[k] = v;
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
