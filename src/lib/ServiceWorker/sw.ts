import { Workspace } from "@/data/Workspace";
import { errF } from "@/lib/errors";
import { defaultFetchHandler } from "@/lib/ServiceWorker/handler";
import { routeRequest } from "@/lib/ServiceWorker/router";
import { WHITELIST } from "@/lib/ServiceWorker/utils";

// Service worker workspace context parsing (inline for SW compatibility)
function getWorkspaceContextFromRequest(request: Request): { workspaceName: string; sessionId?: string; timestamp: number } | null {
  // Parse cookie from request headers
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookieMatch = cookieHeader.match(/activeWorkspace=([^;]+)/);
  if (cookieMatch) {
    try {
      return JSON.parse(decodeURIComponent(cookieMatch[1]));
    } catch (e) {
      console.warn('Service worker: Failed to parse workspace context:', e);
    }
  }
  
  return null;
}

// EnableRemoteLogger();

declare const self: ServiceWorkerGlobalScope;

// --- Service Worker Lifecycle ---

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

// --- Helper Functions ---

function isPopupWindowRequest(request: Request): boolean {
  const referer = request.headers.get('referer');
  // Popup windows typically have no referrer or "about:blank"
  return !referer || referer === 'about:blank' || referer.startsWith('about:');
}

function getWorkspaceFromRequest(request: Request, url: URL): string | null {
  // First, try cookie-based detection (for popup windows)
  const cookieContext = getWorkspaceContextFromRequest(request);
  if (cookieContext?.workspaceName) {
    console.log('SW: Using cookie workspace context:', cookieContext.workspaceName);
    return cookieContext.workspaceName;
  }

  // Fallback to referrer-based detection (existing method)
  if (request.referrer) {
    const legacyWorkspace = Workspace.parseWorkspacePathLegacy(request.referrer).workspaceName;
    if (legacyWorkspace) {
      console.log('SW: Using referrer workspace context:', legacyWorkspace);
      return legacyWorkspace;
    }
  }

  // Final fallback to URL search params
  const urlWorkspace = url.searchParams.get("workspaceName");
  if (urlWorkspace) {
    console.log('SW: Using URL param workspace context:', urlWorkspace);
    return urlWorkspace;
  }

  return null;
}

// --- Main Fetch Controller ---

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  const whiteListMatch = WHITELIST.some((pattern) => pattern.test(url.pathname));
  
  // Handle navigation and script requests directly
  if (request.mode === "navigate" || event.request.destination === "script") {
    return event.respondWith(defaultFetchHandler(event));
  }

  // Special handling for potential popup window requests
  if (isPopupWindowRequest(request)) {
    console.log('SW: Detected popup window request:', request.url);
    // Don't whitelist popup requests - try to get workspace context
  } else if (whiteListMatch) {
    // Apply whitelist only to non-popup requests
    return event.respondWith(defaultFetchHandler(event));
  }

  // If there's no referrer and no cookie context, let browser handle it
  if (!request.referrer && !getWorkspaceContextFromRequest(request)) {
    return event.respondWith(defaultFetchHandler(event));
  }

  try {
    const workspaceName = getWorkspaceFromRequest(request, url);

    // Only handle requests with a valid workspace and same origin
    if (workspaceName && url.origin === self.location.origin) {
      console.log('SW: Routing request to workspace:', workspaceName, request.url);
      event.respondWith(routeRequest(event, workspaceName));
    } else {
      console.log('SW: No workspace context, using default handler:', request.url);
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
