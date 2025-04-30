import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { errF } from "@/lib/errors";
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
  event.waitUntil(self.clients.claim());
});
console.log("loaded");

// Workspace Store
class WorkspaceStore {
  private currentWorkspace: Workspace | null = null;
  private queue: Array<[(workspace: Workspace) => void, (reason?: unknown) => void]> = [];

  setWorkspace(workspace: Workspace) {
    this.currentWorkspace = workspace;
    this.resolveQueue(workspace);
  }

  unsetWorkspace() {
    this.currentWorkspace = null;
    this.rejectQueue();
  }

  async awaitWorkspace(): Promise<Workspace> {
    if (this.currentWorkspace) {
      LOG(`Workspace available: ${this.currentWorkspace?.id}`);
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
}

const workspaceStore = new WorkspaceStore();

// Methods exposed via Comlink
const Methods = {
  async mountWorkspace(workspaceId: string, cb?: (_a?: unknown) => void) {
    if (workspaceStore.peekWorkspace()?.id === workspaceId) {
      LOG("Workspace already mounted");
      return;
    }
    const workspace = await WorkspaceDAO.fetchFromNameAndInit(workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    LOG(`Mounting workspace: ${workspaceId}`);
    workspaceStore.setWorkspace(workspace);
    cb?.();
  },

  registerLogger(logger: (msg: string) => void) {
    LOG = logger;
    LOG("Logger registered");
  },

  async index() {
    const workspace = await workspaceStore.awaitWorkspace();
    if (!workspace) {
      LOG("Reindex / workspace not found");
      return;
    }
    await workspace.disk.index();
  },

  async unmountWorkspace(workspaceId: string) {
    const workspace = await workspaceStore.awaitWorkspace();
    if (!workspace) {
      LOG("Unmount workspace / Workspace not found");
      return;
    }
    LOG(`Unmounting workspace: ${workspaceId}`);
    await workspace.teardown();
    workspaceStore.unsetWorkspace();
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

  const workspace = await workspaceStore.awaitWorkspace();

  if (!workspace) throw new Error("No workspace mounted");

  try {
    await Promise.race([
      workspace.disk.awaitFirstIndex(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Indexing timeout")), 5000)),
    ]);

    const { eTag } = workspace.disk.nodeFromPath(AbsPath.New(pathname)) ?? {};
    const contents = await workspace.disk.readFile(AbsPath.New(pathname));

    if (contents) {
      const requestETag = event.request.headers.get("If-None-Match");
      if (requestETag === eTag) {
        return new Response(null, { status: 304, statusText: "Not Modified" });
      }

      return new Response(contents, {
        headers: {
          "Content-Type": getMimeType(pathname),
          ...(eTag ? { ETag: eTag } : {}),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (error) {
    LOG(errF`Error reading file from workspace: ${error}`.toString());
  }

  return fetch(event.request);
}

export type RemoteObj = Comlink.Remote<typeof Methods>;

console.log(">>>>> Service Worker loaded");
