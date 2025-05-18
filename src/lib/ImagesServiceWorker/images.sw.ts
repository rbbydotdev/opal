import { isThumbnailHref } from "@/Db/isThumbnailHref";
import { Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { createThumbnailWW } from "@/lib/createThumbnailWW";
import { errF } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { RemoteLogger } from "@/lib/ImagesServiceWorker/RemoteLogger";
import { getMimeType } from "@/lib/mimeType";
import { absPath, AbsPath, BasePath } from "@/lib/paths";

const WHITELIST = ["/opal.svg", "/favicon.ico", "/icon.svg"];

declare const self: ServiceWorkerGlobalScope;

console.log = function (msg: string) {
  RemoteLogger(msg, "log");
};

console.debug = function (msg: string) {
  RemoteLogger(msg, "debug");
};
console.error = function (msg: string) {
  RemoteLogger(msg, "error");
};
console.warn = function (msg: string) {
  RemoteLogger(msg, "warn");
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
  let referrerPath = "";
  try {
    referrerPath = new URL(event.request.referrer).pathname;
  } catch (e) {
    console.error(errF`Error parsing referrer: ${event.request.referrer}, ${e}`.toString());
    return event.respondWith(fetch(event.request));
  }
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
  async readImg(path: AbsPath | string) {
    return this.workspace?.readFile(absPath(path));
  }
  async readThumb(path: AbsPath | string) {
    return this.workspace?.readThumbFile(absPath(path));
  }

  getCache(workspaceId = this.workspaceId!): Promise<Cache> {
    return caches.open(Workspace.cacheKey(workspaceId));
  }
  setWorkspaceId(workspaceId: string) {
    this.workspaceId = workspaceId;
    return this;
  }
  async tryWorkspace(workspaceId: string): Promise<Workspace> {
    if (!this.workspace || workspaceId !== this.workspace.name) {
      this.setWorkspace(await WorkspaceDAO.byName(workspaceId).then((wsd) => wsd.toModel()));
    }
    if (!this.workspace) {
      throw new Error("Workspace not found");
    }
    return this.workspace;
  }
})();

async function handleImageRequest(event: FetchEvent, url: URL, workspaceId: string): Promise<Response> {
  try {
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
      console.log(`Cache hit for: ${url.href.replace(url.origin, "")}`);
      return cachedResponse;
    }
    console.log(`Cache miss for: ${url.href.replace(url.origin, "")}, fetching from workspace`);
    const workspace = await SWWStore.tryWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    let contents: Uint8Array<ArrayBufferLike> | null = null;
    try {
      contents = (await (isThumbnail ? SWWStore.readThumb(decodedPathname) : SWWStore.readImg(decodedPathname)).catch(
        () => null
      )) as Uint8Array<ArrayBufferLike>;
      if (contents === null && isThumbnail && (await workspace.disk.pathExists(absPath(decodedPathname)))) {
        console.log(`Thumbnail not found, creating thumbnail for: ${decodedPathname}`);
        const thumbPic = await createThumbnailWW(
          (await SWWStore.readImg(absPath(decodedPathname))) as Uint8Array<ArrayBufferLike>
        );
        await workspace.thumbs.writeFileRecursive(absPath(decodedPathname), thumbPic);
        contents = thumbPic;
      }

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
  } catch (e) {
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
