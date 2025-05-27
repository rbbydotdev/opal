import { Thumb, Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { RemoteLogger } from "@/lib/ImagesServiceWorker/RemoteLogger";
import { getMimeType } from "@/lib/mimeType";
import { absPath, BasePath } from "@/lib/paths";

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

console.log = function (msg: unknown) {
  RemoteLogger(formatConsoleMsg(msg), "log");
};

console.debug = function (msg: unknown) {
  RemoteLogger(formatConsoleMsg(msg), "debug");
};
console.error = function (msg: unknown) {
  RemoteLogger(formatConsoleMsg(msg), "error");
};
console.warn = function (msg: unknown) {
  RemoteLogger(formatConsoleMsg(msg), "warn");
};
// // Logger

self.addEventListener("activate", function (event) {
  return event.waitUntil(self.clients.claim()); // Become available to all pages
});

// Service Worker Installation and Activation
self.addEventListener("install", (event: ExtendableEvent) => {
  return event.waitUntil(self.skipWaiting());
});

// Fetch Event Listener
self.addEventListener("fetch", async (event) => {
  //if no referrer, just fetch the request
  if (!event.request.referrer) {
    return event.respondWith(fetch(event.request));
  }
  const url = new URL(event.request.url);
  let referrerPath = "";
  try {
    referrerPath = new URL(event.request.referrer).pathname;
  } catch (e) {
    console.error(`Error parsing referrer: ${event.request.referrer}, ${e}`);
    throw new NotFoundError(`Error parsing referrer ${event.request.referrer}`);
    // return event.respondWith(fetch(event.request));
  }
  try {
    const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
    if (
      workspaceId &&
      (event.request.destination === "image" || isImageType(url.pathname)) &&
      url.origin === self.location.origin && // Only intercept local requests
      url.pathname !== "/favicon.ico" &&
      !WHITELIST.includes(url.pathname)
    ) {
      return event.respondWith(handleImageRequest(event, url, workspaceId));
    }
  } catch (e) {
    console.error(errF`Error parsing workspaceId from referrer: ${referrerPath}, ${e}`.toString());
    return event.respondWith(fetch(event.request));
  }

  return event.respondWith(fetch(event.request));
});

const SWWStore = new (class SwWorkspace {
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
    return (this.workspace = WorkspaceDAO.byName(workspaceId).then((wsd) => wsd.toModel()));
  }
})();

async function handleImageRequest(event: FetchEvent, url: URL, workspaceId: string): Promise<Response> {
  try {
    const decodedPathname = BasePath.decode(url.pathname);
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

    if (!workspace) throw new Error("Workspace not found");
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    const contents: Uint8Array<ArrayBufferLike> = isThumbnail
      ? ((await workspace.readOrMakeThumb(decodedPathname)) as Uint8Array<ArrayBufferLike>)
      : ((await workspace.readFile(absPath(decodedPathname))) as Uint8Array<ArrayBufferLike>);

    const response = new Response(contents, {
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
