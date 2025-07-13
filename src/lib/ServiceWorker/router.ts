import {
  convertDocxHandler,
  defaultFetchHandler,
  downloadEncryptedHandler,
  downloadHandler,
  faviconHandler,
  imageHandler,
  replaceMdImageHandler,
  RequestContext,
  uploadImageHandler,
  workspaceSearchHandler,
} from "@/lib/ServiceWorker/handler";

type HandlerFunction = (context: RequestContext) => Response | Promise<Response>;

interface Route {
  method: "GET" | "POST" | "ANY";
  pattern: RegExp;
  handler: HandlerFunction;
  paramNames: string[];
}

// Helper to create routes from simple path strings
function createRoute(method: "GET" | "POST" | "ANY", path: string, handler: HandlerFunction): Route {
  const paramNames: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    })}$`
  );
  return { method, pattern, handler, paramNames };
}

// --- Route Definitions ---
const routes: Route[] = [
  createRoute("POST", "/replace-md-images", replaceMdImageHandler),
  createRoute("POST", "/upload-image/.*", uploadImageHandler),
  createRoute("POST", "/upload-docx/.*", convertDocxHandler),
  createRoute("GET", "/workspace-search/:workspaceName", workspaceSearchHandler),
  createRoute("POST", "/download-encrypted.zip", downloadEncryptedHandler),
  createRoute("GET", "/download.zip", downloadHandler),
  createRoute("GET", "/favicon.svg", faviconHandler),
  createRoute("GET", "/icon.svg", faviconHandler),
  // This is a catch-all for images, so it should be last among GETs
  createRoute("GET", "/.*", imageHandler),
];

export function routeRequest(event: FetchEvent, workspaceId: string) {
  const { request } = event;
  const url = new URL(request.url);

  for (const route of routes) {
    if (route.method !== "ANY" && route.method !== request.method) {
      continue;
    }

    const match = url.pathname.match(route.pattern);
    if (match) {
      const params = route.paramNames.reduce((acc, name, index) => {
        acc[name] = decodeURIComponent(match[index + 1]!);
        return acc;
      }, {} as Record<string, string>);

      const context: RequestContext = { event, url, workspaceId, params };
      return route.handler(context);
    }
  }

  // If no specific route is matched, fall back to the default fetch handler
  return defaultFetchHandler(event);
}
