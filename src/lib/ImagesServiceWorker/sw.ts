import { Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { errF } from "@/lib/errors";
import { SwLogger } from "@/lib/ImagesServiceWorker/ImgSwSetup";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths";
import * as Comlink from "comlink";

declare const self: ServiceWorkerGlobalScope;

// Logger
let LOG = (_msg: string) => {};

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

  async awaitWorkspace(): Promise<Workspace> {
    if (this.currentWorkspace) {
      LOG(`Current Workspace: ${this.currentWorkspace?.id}`);
      return this.currentWorkspace;
    }
    LOG("Awaiting workspace...");
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
    const workspace = await WorkspaceDAO.fetchFromNameAndInit(workspaceName);
    if (!workspace) throw new Error("Workspace not found");

    LOG(`Mounting workspace: ${workspaceName}`);
    WorkspaceStore.setWorkspace(workspace);
    cb?.();
  },

  registerLogger(logger: (msg: string) => void) {
    LOG = logger;
    LOG("Logger registered");
  },

  async index() {
    const workspace = WorkspaceStore.peekWorkspace() ?? (await WorkspaceStore.awaitWorkspace());
    if (!workspace) {
      LOG("Reindex / workspace not found");
      return;
    }
    await workspace.disk.firstIndex();
  },

  async unmountWorkspace(workspaceId: string) {
    // const workspace = await WorkspaceStore.awaitWorkspace();
    // if (!workspace) {
    //   LOG("Unmount workspace / Workspace not found");
    //   return;
    // }
    LOG(`Unmounting workspace: ${workspaceId}`);
    WorkspaceStore.tearDown();
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
  if (event.request.destination === "image" && !url.pathname.startsWith("/icons") && url.pathname !== "/favicon.ico") {
    void event.respondWith(handleImageRequest(event, url));
  }
});

async function handleImageRequest(event: FetchEvent, url: URL): Promise<Response> {
  const pathname = decodeURIComponent(url.pathname);
  LOG(`Intercepted request for: ${url.pathname}`);

  const workspace = WorkspaceStore.peekWorkspace() ?? (await WorkspaceStore.awaitWorkspace());

  const cache = await caches.open(WorkspaceStore.imageCacheKey); // Open the cache

  // Check if the request is already in the cache
  const cachedResponse = await cache.match(event.request);
  if (cachedResponse) {
    LOG(`Cache hit for: ${url.pathname}`);

    return cachedResponse;
  }

  LOG(`Cache miss for: ${url.pathname}, fetching from workspace`);

  if (!workspace) throw new Error("No workspace mounted");

  try {
    await Promise.race([
      workspace.disk.awaitFirstIndex(),
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
    LOG(errF`Error reading file from workspace: ${error}`.toString());
  }

  return fetch(event.request);
}

export type RemoteObj = Comlink.Remote<typeof Methods>;
