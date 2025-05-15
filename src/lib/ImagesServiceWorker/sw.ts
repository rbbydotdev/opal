import { Workspace } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths";

const WHITELIST = ["/opal.svg", "/favicon.ico", "/icon.svg"];

declare const self: ServiceWorkerGlobalScope;

// Logger
const SwLogger = (_msg: string) => console.log(_msg);

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
    event.request.destination === "image" &&
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
  get cacheKey() {
    return (this.workspace?.name ?? "unknown") + "/cache";
  }
  backgroundCache = async () => {
    if (!this.workspace) throw new Error("backgroundCache; no workspace");
    await this.workspace.awaitFirstIndex();
    const cache = await this.getCache();
    for (const imgPath of this.workspace.getImages()) {
      const contents = await this.workspace.disk.readFile(imgPath);
      if (contents) {
        const response = new Response(contents, {
          headers: {
            "Content-Type": getMimeType(imgPath.str),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
        void cache.put(new Request(imgPath.str), response.clone());
      }
    }
  };
  getCache() {
    return caches.open(this.cacheKey); // Open the cache
  }
  async tryWorkspace(route: string): Promise<Workspace> {
    // this.workspace.name
    const { workspaceId } = Workspace.parseWorkspacePath(route);
    if (workspaceId !== this.workspace?.name) {
      if (this.workspace) this.workspace.teardown();
      this.setWorkspace(await Workspace.fetchFromRouteAndInit(route));
      void this.backgroundCache();
    }
    return this.workspace as Workspace;
  }
  getWorkspace() {
    return this.workspace;
  }
})();

async function handleImageRequest(event: FetchEvent, url: URL): Promise<Response> {
  const pathname = decodeURIComponent(url.pathname);
  SwLogger(`Intercepted request for: ${url.pathname}`);
  const workspace = await SWWStore.tryWorkspace(new URL(event.request.referrer).pathname);
  if (!workspace) throw new Error("No workspace mounted");
  const cache = await SWWStore.getCache();
  const cachedResponse = await cache.match(event.request);
  if (cachedResponse) {
    SwLogger(`Cache hit for: ${url.pathname}`);
    return cachedResponse;
  }
  SwLogger(`Cache miss for: ${url.pathname}, fetching from workspace`);
  try {
    await Promise.race([
      workspace.awaitFirstIndex(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Indexing timeout")), 5000)),
    ]);
    const contents = await workspace.disk.readFile(AbsPath.New(pathname));

    if (contents) {
      const response = new Response(contents, {
        headers: {
          "Content-Type": getMimeType(pathname),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });

      void cache.put(event.request, response.clone());
      return response;
    }
  } catch (error) {
    SwLogger(errF`Error reading file from workspace: ${error}`.toString());
  }

  return fetch(event.request);
}
