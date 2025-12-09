import {
  convertDocxHandler,
  defaultFetchHandler,
  downloadEncryptedHandler,
  downloadHandler,
  faviconHandler,
  imageHandler,
  replaceFileHandler,
  replaceMdImageHandler,
  RequestContext,
  styleSheetHandler,
  uploadImageHandler,
  uploadMarkdownHandler,
  workspaceFilenameSearchHandler,
  workspaceSearchHandler,
} from "@/lib/service-worker/handler";
import { SuperUrl } from "@/lib/service-worker/SuperUrl";

type HandlerFunction = (context: RequestContext) => Response | Promise<Response>;

interface Route {
  method: "GET" | "POST" | "NAV" | "ANY";
  pattern: RegExp;
  handler: HandlerFunction;
  paramNames: string[];
}

// Helper to create routes from simple path strings
function createRoute(method: "GET" | "POST" | "NAV" | "ANY", path: string, handler: HandlerFunction): Route {
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

const routes: Route[] = [
  createRoute("POST", "/replace-md-images", replaceMdImageHandler),
  createRoute("POST", "/replace-files", replaceFileHandler),
  createRoute("POST", "/upload-image/.*", uploadImageHandler),
  createRoute("POST", "/upload-markdown/.*", uploadMarkdownHandler),
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

export function hasRouteMatch(event: FetchEvent, method?: Route["method"]): boolean {
  const { request } = event;
  const url = new SuperUrl(request.url);
  const requestMethod = method || request.method;
  for (const route of routes.filter((route) => route.method === "ANY" || route.method === requestMethod)) {
    if (url.pathname.match(route.pattern)) return true;
  }
  return false;
}

export async function routeRequest(
  event: FetchEvent,
  workspaceParam: string | null = null,
  methodOverride: Route["method"] | null = null
): Promise<Response> {
  const { request } = event;
  const url = new SuperUrl(request.url);
  const requestMethod = methodOverride || request.method;

  logger.log(`RouteRequest START: ${requestMethod} ${url.pathname}`);
  logger.log(`   - Workspace param: ${workspaceParam || "null"}`);
  logger.log(`   - Method override: ${methodOverride || "none"}`);
  logger.log(`   - Search params: ${url.search || "none"}`);

  for (const route of routes) {
    if (route.method !== "ANY" && route.method !== requestMethod) {
      logger.debug(`   Skipping route (method mismatch): ${route.method} ${route.pattern.source}`);
      continue;
    }

    const match = url.pathname.match(route.pattern);
    if (match) {
      logger.log(`   ROUTE MATCHED: ${route.method} ${route.pattern.source}`);

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

      //if workspaceParam is null try to get it from params
      if (!workspaceParam && params.workspaceName) {
        workspaceParam = params.workspaceName;
        logger.log(`   Workspace from params: ${workspaceParam}`);
      }

      logger.log(`   Route params: ${Object.keys(params).length ? JSON.stringify(params) : "none"}`);
      logger.log(`   Search params: ${Object.keys(searchParams).length ? JSON.stringify(searchParams) : "none"}`);
      logger.log(`   Final workspace: ${workspaceParam || "unknown"}`);
      logger.log(`   Calling handler: ${route.handler.name || "anonymous"}`);

      const context: RequestContext = { event, url, workspaceName: workspaceParam || "unknown", params, searchParams };
      const response = await route.handler(context);

      logger.log(`   Handler completed with status: ${response.status}`);
      return response;
    } else {
      logger.debug(`   Route pattern didn't match: ${route.pattern.source}`);
    }
  }

  // If no specific route is matched, fall back to the default fetch handler
  logger.log(`   No route matched, using default fetch handler`);
  const response = await defaultFetchHandler(event);
  logger.log(`   Default handler completed with status: ${response.status}`);
  return response;
}
