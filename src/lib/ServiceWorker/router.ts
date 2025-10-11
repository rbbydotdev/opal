import {
  convertDocxHandler,
  defaultFetchHandler,
  downloadEncryptedHandler,
  downloadHandler,
  faviconHandler,
  imageHandler,
  replaceMdImageHandler,
  replaceFileHandler,
  RequestContext,
  styleSheetHandler,
  uploadImageHandler,
  workspaceSearchHandler,
  workspaceFilenameSearchHandler,
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

  // Replace :paramName with a capturing group while storing param names
  let patternSource = path.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });

  // Support wildcard multi-extension syntax:
  //  - *.{jpg,jpeg,webp}
  //  - *.{jpg|jpeg|webp}
  // Converts to a non-capturing group matching any filename with those extensions.
  patternSource = patternSource.replace(/\*\.\{([^}]+)\}/g, (_, exts) => {
    const extGroup = exts
      .split(/[,|]/)
      .map((e: string) => e.trim())
      .filter(Boolean)
      .join("|");
    return `.*\\.(?:${extGroup})`;
  });

  const pattern = new RegExp(`^${patternSource}$`);
  return { method, pattern, handler, paramNames };
}

// --- Route Definitions ---
const routes: Route[] = [
  createRoute("POST", "/replace-md-images", replaceMdImageHandler),
  createRoute("POST", "/replace-files", replaceFileHandler),
  createRoute("POST", "/upload-image/.*", uploadImageHandler),
  createRoute("POST", "/upload-docx/.*", convertDocxHandler),
  createRoute("GET", "/workspace-search/:workspaceName", workspaceSearchHandler),
  createRoute("GET", "/workspace-filename-search/:workspaceName", workspaceFilenameSearchHandler),
  createRoute("POST", "/download-encrypted.zip", downloadEncryptedHandler),
  createRoute("GET", "/download.zip", downloadHandler),
  createRoute("GET", "/favicon.svg", faviconHandler),
  createRoute("GET", "/.*.{css}", styleSheetHandler),
  createRoute("GET", "/src/app/icon.svg", faviconHandler),
  createRoute("GET", "/icon.svg", faviconHandler),
  createRoute("GET", "/.*.{jpg|webp|jpeg|png|svg}", imageHandler),
];

export async function routeRequest(event: FetchEvent, workspaceParam: string) {
  const { request } = event;
  const url = new URL(request.url);

  for (const route of routes) {
    if (route.method !== "ANY" && route.method !== request.method) {
      continue;
    }

    const match = url.pathname.match(route.pattern);
    if (match) {
      const params = route.paramNames.reduce(
        (acc, name, index) => {
          acc[name] = decodeURIComponent(match[index + 1]!);
          return acc;
        },
        {} as Record<string, string>
      );
      const searchParams = Object.fromEntries(
        Array.from(url.searchParams.entries()).map(([key, value]) => {
          try {
            return [key, JSON.parse(value)];
          } catch {
            return [key, value];
          }
        })
      );

      const context: RequestContext = { event, url, workspaceName: workspaceParam, params, searchParams };
      return route.handler(context);
    }
  }

  // If no specific route is matched, fall back to the default fetch handler
  return defaultFetchHandler(event);
}
