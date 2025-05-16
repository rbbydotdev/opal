import { isThumbnailHref } from "@/Db/isThumbnailHref";
import { Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { absPath, AbsPath, BasePath } from "@/lib/paths";

const WHITELIST = ["/opal.svg", "/favicon.ico", "/icon.svg"];

declare const self: ServiceWorkerGlobalScope;

const RemoteSwLogger = (_msg: string, type = "log") => {
  void fetch("http://localhost:8080", {
    method: "POST",
    body: JSON.stringify({
      msg: _msg,
      type,
    }),
    signal: AbortSignal.timeout(1000),
  }).catch(() => {});
};

console.log = function (msg: string) {
  RemoteSwLogger(msg, "log");
};

console.debug = function (msg: string) {
  RemoteSwLogger(msg, "debug");
};
console.error = function (msg: string) {
  RemoteSwLogger(msg, "error");
};
console.warn = function (msg: string) {
  RemoteSwLogger(msg, "warn");
};
// Logger

self.addEventListener("activate", function (event) {
  return event.waitUntil(self.clients.claim()); // Become available to all pages
});

// Service Worker Installation and Activation
self.addEventListener("install", (event: ExtendableEvent) => {
  return event.waitUntil(self.skipWaiting());
});

// Fetch Event Listener
self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);
  const referrerPath = new URL(event.request.referrer).pathname;
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

  return event.respondWith(fetch(event.request));
});

const SWWStore = new (class SwWorkspace {
  private workspace: Workspace | null = null;
  private workspaceId: string | null = null;
  setWorkspace(workspace: Workspace) {
    this.workspaceId = workspace.name;
    return (this.workspace = workspace);
  }
  async readImage(path: AbsPath | string, type: "thumb" | "image") {
    if (type === "thumb") {
      return this.workspace?.getImageThumbFile(absPath(path));
    } else {
      return this.workspace?.readFile(absPath(path));
    }
  }

  getCache(workspaceId = this.workspaceId!): Promise<Cache> {
    return caches.open(Workspace.cacheKey(workspaceId));
  }
  setWorkspaceId(workspaceId: string) {
    this.workspaceId = workspaceId;
    return this;
  }
  async tryWorkspace(workspaceId: string): Promise<Workspace> {
    if (workspaceId !== this.workspace?.name) {
      this.setWorkspace(await WorkspaceDAO.byName(workspaceId).then((wsd) => wsd.toModel()));
    }
    if (!this.workspace) {
      throw new Error("Workspace not found");
    }
    return this.workspace;
  }
})();

async function handleImageRequest(event: FetchEvent, url: URL, workspaceId: string): Promise<Response> {
  const decodedPathname = BasePath.decode(url.pathname);
  const isThumbnail = isThumbnailHref(url.href);
  console.log(`Intercepted request for: 
    decodedPathname: ${decodedPathname}
    url.pathname: ${url.pathname}
    href: ${url.href}
    isThumbnail: ${isThumbnail}
  `);
  const cache = await SWWStore.getCache(workspaceId);
  const cachedResponse = await cache.match(event.request);
  if (cachedResponse) {
    console.log(`Cache hit for: ${decodedPathname}`);
    return cachedResponse;
  }
  console.log(`Cache miss for: ${decodedPathname}, fetching from workspace`);
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  try {
    const contents = await SWWStore.readImage(decodedPathname, isThumbnail ? "thumb" : "image");
    if (contents) {
      const response = new Response(contents, {
        headers: {
          "Content-Type": getMimeType(decodedPathname),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });

      await cache.put(event.request, response.clone());
      return response;
    }
  } catch (error) {
    console.log(errF`Error reading file from workspace: ${error}`.toString());
  }

  return fetch(event.request);
}
