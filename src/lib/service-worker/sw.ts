import { ENV } from "@/lib/env";
import { errF } from "@/lib/errors/errors";
import { initializeGlobalLogger } from "@/lib/initializeGlobalLogger";
import { defaultFetchHandler } from "@/lib/service-worker/handler";
import { hasRouteMatch, routeRequest } from "@/lib/service-worker/router";
import { RemoteLoggerLogger, WHITELIST } from "@/lib/service-worker/utils";
import { Workspace } from "@/workspace/Workspace";

declare const self: ServiceWorkerGlobalScope;

initializeGlobalLogger(RemoteLoggerLogger("ServiceWorker"));

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", (event: FetchEvent) => {
  // const { log, error: errorLog } = !DEBUG_CONSOLE ? console : EnableRemoteLogger();
  const { request } = event;
  const url = new URL(request.url);

  logger.log(`Fetch event for: ${request.url} | Mode: ${request.mode} | Destination: ${request.destination}`);
  if (!ENV.HOST_URLS.some((hostUrl) => url.origin === hostUrl)) {
    logger.log(`Bypassing fetch for non-host URL: ${request.url}`);
    return;
  }

  const whiteListMatch = WHITELIST.some((item) => item.test(url, request));
  // If there's no referrer, it's likely a direct navigation or non-app request.
  // Let the browser handle it directly.
  if ((request.mode === "navigate" || !request.referrer) && hasRouteMatch(event, "NAV")) {
    logger.log(`Handling navigation request for: ${request.url}`);
    return event.respondWith(routeRequest(event, null, "NAV"));
  }
  if (!request.referrer || whiteListMatch || event.request.destination === "script") {
    return;
  }

  try {
    let workspaceName: string | null = null;

    // First, try to get workspace name from search params
    const searchParams = url.searchParams;
    if (searchParams.has("workspaceName")) {
      workspaceName = searchParams.get("workspaceName");
    }

    // If no workspace name in search params and we have a referrer, check referrer search params
    if (!workspaceName && request.referrer) {
      try {
        const referrerUrl = new URL(request.referrer);
        const referrerSearchParams = referrerUrl.searchParams;
        if (referrerSearchParams.has("workspaceName")) {
          workspaceName = referrerSearchParams.get("workspaceName");
        }
      } catch {
        // If parsing referrer URL fails, ignore
      }
    }

    // If no workspace name in search params, try to get it from the request URL itself
    if (!workspaceName) {
      try {
        const urlResult = Workspace.parseWorkspacePath(request.url);
        workspaceName = urlResult.workspaceName;
      } catch {
        // If parsing URL fails, ignore and try referrer
      }
    }

    // If no workspace name found and we have a referrer, try parsing that
    if (!workspaceName && request.referrer) {
      try {
        const referrerResult = Workspace.parseWorkspacePath(request.referrer);
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
      logger.log(`Routing request for workspace '${workspaceName}': ${request.url}`);
      event.respondWith(routeRequest(event, workspaceName));
    } else {
      logger.log(`Passing through request (no workspace match): ${request.url}`);
      //
      event.respondWith(defaultFetchHandler(event));
    }
  } catch (e) {
    logger.error(
      errF`Error in fetch controller: ${request.url}. Referrer: ${request.referrer}. Error: ${e}`.toString()
    );
    // If we can't parse the workspace or another error occurs, fallback to network.
    return; //event.respondWith(defaultFetchHandler(event));
  }
});
