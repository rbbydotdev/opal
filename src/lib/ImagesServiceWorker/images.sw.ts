// import { Thumbnail } from "@/Db/Thumbnails";
import { isThumbnailHref } from "@/Db/isThumbnailHref";
import { Workspace } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, BasePath } from "@/lib/paths";

const WHITELIST = ["/opal.svg", "/favicon.ico", "/icon.svg"];

declare const self: ServiceWorkerGlobalScope;

const REMOTE_DEBUG = false;
if (REMOTE_DEBUG) {
  const RemoteSwLogger = (_msg: string, type = "log") => {
    void fetch("http://localhost:8080", {
      method: "POST",
      body: JSON.stringify({
        msg: _msg,
        type,
      }),
      signal: AbortSignal.timeout(500),
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
}
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
  if (
    (event.request.destination === "image" || isImageType(url.pathname)) &&
    url.origin === self.location.origin && // Only intercept local requests
    url.pathname !== "/favicon.ico" &&
    !WHITELIST.includes(url.pathname)
  ) {
    return event.respondWith(handleImageRequest(event, url));
  }
});

const SWWStore = new (class SwWorkspace {
  private workspace: Workspace | null = null;
  setWorkspace(workspace: Workspace) {
    return (this.workspace = workspace);
  }
  backgroundCache = async () => {
    return;
    if (!this.workspace) throw new Error("backgroundCache; no workspace");
    await this.workspace.awaitFirstIndex();
    const cache = await this.getCache();
    const Promises: Promise<void>[] = [];
    for (const imgPath of this.workspace.getImages()) {
      const contents = await this.workspace.disk.readFile(imgPath);
      if (contents) {
        const response = new Response(contents, {
          headers: {
            "Content-Type": getMimeType(imgPath.str),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
        Promises.push(cache.put(new Request(imgPath.str), response.clone()));
      }
    }
    await Promise.all(Promises).then(() => Date.now());
  };
  getCache() {
    return caches.open(this.getWorkspace()!.cacheKey);
  }
  async tryWorkspace(route: string): Promise<Workspace> {
    // this.workspace.name
    const { workspaceId } = Workspace.parseWorkspacePath(route);
    if (workspaceId !== this.workspace?.name) {
      if (this.workspace) this.workspace.teardown();
      this.setWorkspace(await Workspace.fetchFromRouteAndInit(route));
      //disabling bground cache for now burns too much comput imo
      void this.backgroundCache().then(() => console.log("Background cache updated"));
    }
    return this.workspace as Workspace;
  }
  getWorkspace() {
    return this.workspace;
  }
})();

async function handleImageRequest(event: FetchEvent, url: URL): Promise<Response> {
  const decodedPathname = BasePath.decode(url.pathname);
  const isThumbnail = isThumbnailHref(url.href);
  console.log(`Intercepted request for: 
    decodedPathname: ${decodedPathname}
    url.pathname: ${url.pathname}
    href: ${url.href}
    isThumbnail: ${isThumbnail}
  `);
  const workspace = await SWWStore.tryWorkspace(new URL(event.request.referrer).pathname);
  if (!workspace) throw new Error("No workspace mounted");
  const cache = await SWWStore.getCache();
  const cachedResponse = await cache.match(event.request);
  if (cachedResponse) {
    console.log(`Cache hit for: ${decodedPathname}`);
    return cachedResponse;
  }
  console.log(`Cache miss for: ${decodedPathname}, fetching from workspace`);
  try {
    await Promise.race([
      workspace.awaitFirstIndex(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Indexing timeout")), 5000)),
    ]);

    // console.log(url.href, Thumbnail.isThumbnailHref(url.href), decodedPathname);
    const contents = isThumbnail
      ? await workspace.getImageThumbFile(AbsPath.New(decodedPathname))
      : await workspace.readFile(AbsPath.New(decodedPathname));

    if (contents) {
      const response = new Response(contents, {
        headers: {
          "Content-Type": getMimeType(decodedPathname),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });

      void cache.put(event.request, response.clone());
      return response;
    }
  } catch (error) {
    console.log(errF`Error reading file from workspace: ${error}`.toString());
  }

  return fetch(event.request);
}
