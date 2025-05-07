import { Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths";
import * as Comlink from "comlink";

// ahhh! https://web.dev/articles/service-worker-mindset

/*


TODO: image cache is working very well, but will have to decide on a cache eviction strategy,
should i just evict the cache when the workspace is unmounted?
or should i evict the cache when the workspace is mounted?(
  could cache all images in the background
)
or should i evict an item in the cache before its name is added as new file




*/
declare const self: ServiceWorkerGlobalScope;

// Logger
let SwLogger = (_msg: string) => {};

// Service Worker Installation and Activation
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  SwLogger("Service Worker activated");
  WorkspaceStore.tearDown();
  event.waitUntil(self.clients.claim());
});

// Workspace Store
const WorkspaceStore = new (class {
  private currentWorkspace: Workspace | null = null;
  private queue: Array<[(workspace: Workspace) => void, (reason?: unknown) => void]> = [];

  get imageCacheKey() {
    return `${this.currentWorkspace?.id}/image-cache`;
  }

  setWorkspace(workspace: Workspace) {
    this.currentWorkspace = workspace;
    this.resolveQueue(workspace);
  }

  tearDown() {
    this.currentWorkspace?.teardown();
    this.currentWorkspace = null;
    this.rejectQueue();
    this.queue = [];
  }
  getCache() {
    return caches.open(this.imageCacheKey);
  }
  clearCache() {
    return caches.delete(this.imageCacheKey);
  }

  async awaitWorkspace(): Promise<Workspace> {
    if (this.currentWorkspace) {
      SwLogger(`Current Workspace: ${this.currentWorkspace?.id}`);
      return this.currentWorkspace;
    }
    SwLogger("Awaiting workspace...");
    return new Promise<Workspace>((resolve, reject) => {
      this.queue.push([resolve, reject]);
    });
  }

  peekWorkspace(): Workspace | null {
    return this.currentWorkspace;
  }

  private resolveQueue(workspace: Workspace) {
    while (this.queue.length) {
      const [resolve] = this.queue.pop()!;
      resolve(workspace);
    }
  }

  private rejectQueue() {
    while (this.queue.length) {
      const [, reject] = this.queue.pop()!;
      reject();
    }
  }
})();

// Methods exposed via Comlink
const Methods = {
  async mountWorkspace(workspaceName: string, cb?: (_a?: unknown) => void) {
    // await this.local.emit(DiskLocalEvents.INDEX);
    // await this.remote.emit(DiskLocalEvents.INDEX);
    // WorkspaceStore.peekWorkspace()?.
    if (workspaceName !== WorkspaceStore.peekWorkspace()?.name) {
      WorkspaceStore.tearDown();

      const workspace = await WorkspaceDAO.fetchFromNameAndInit(workspaceName);
      if (!workspace) throw new Error("Workspace not found");
      SwLogger(`Mounting workspace: ${workspaceName}`);
      WorkspaceStore.setWorkspace(workspace);
      ///EXPERIMENTAL
      void (async function backgroundCache() {
        await workspace.awaitFirstIndex();
        const cache = await caches.open(WorkspaceStore.imageCacheKey);
        for (const imgPath of workspace.getImages()) {
          const contents = await workspace.disk.readFile(imgPath);
          if (contents) {
            const response = new Response(contents, {
              headers: {
                "Content-Type": getMimeType(imgPath.str),
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
            await cache.put(new Request(imgPath.str), response.clone());
          }
        }
      })().catch((_err) => SwLogger(`Failed background cache`));
    }
    cb?.();
  },

  registerLogger(logger: (msg: string) => void) {
    SwLogger = logger;
    SwLogger("Logger registered");
  },

  async index() {
    const workspace = WorkspaceStore.peekWorkspace() ?? (await WorkspaceStore.awaitWorkspace());
    if (!workspace) {
      SwLogger("Reindex / workspace not found");
      return;
    }
    await workspace.disk.firstIndex();
  },

  async unmountWorkspace(workspaceId: string) {
    SwLogger(`Skipping unmounting ${workspaceId} workspace experimentally yall`);
    // LOG(`Unmounting workspace: ${workspaceId}`);
    // WorkspaceStore.tearDown();
  },
};

// Message Event Listener
self.addEventListener("message", (event) => {
  if (event.data.comlinkInit) {
    Comlink.expose(Methods, event.data.port);
  }
});

// Fetch Event Listener
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.destination === "image" &&
    !url.pathname.startsWith("/icon" /*TODO FIX*/) &&
    url.pathname !== "/favicon.ico"
  ) {
    void event.respondWith(handleImageRequest(event, url));
  }
});

async function handleImageRequest(event: FetchEvent, url: URL): Promise<Response> {
  const pathname = decodeURIComponent(url.pathname);
  SwLogger(`Intercepted request for: ${url.pathname}`);

  const workspace = WorkspaceStore.peekWorkspace() ?? (await WorkspaceStore.awaitWorkspace());

  const cache = await caches.open(WorkspaceStore.imageCacheKey); // Open the cache

  // Check if the request is already in the cache
  //TODO will need to evict items from the cache when its added to the cache or removed
  const cachedResponse = await cache.match(event.request);
  if (cachedResponse) {
    SwLogger(`Cache hit for: ${url.pathname}`);

    return cachedResponse;
  }

  SwLogger(`Cache miss for: ${url.pathname}, fetching from workspace`);

  if (!workspace) throw new Error("No workspace mounted");

  try {
    await Promise.race([
      workspace.awaitFirstIndex(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Indexing timeout")), 5000)),
    ]);

    // const { eTag } = workspace.disk.nodeFromPath(AbsPath.New(pathname)) ?? {};
    const contents = await workspace.disk.readFile(AbsPath.New(pathname));

    if (contents) {
      // const requestETag = event.request.headers.get("If-None-Match");
      // if (requestETag === eTag) {
      //   return new Response(null, { status: 304, statusText: "Not Modified" });
      // }

      const response = new Response(contents, {
        headers: {
          "Content-Type": getMimeType(pathname),
          // ...(eTag ? { ETag: eTag } : {}),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });

      // Store the response in the cache
      await cache.put(event.request, response.clone());

      return response;
    }
  } catch (error) {
    SwLogger(errF`Error reading file from workspace: ${error}`.toString());
  }

  return fetch(event.request);
}

export type RemoteObj = Comlink.Remote<typeof Methods>;
