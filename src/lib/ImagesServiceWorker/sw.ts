import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { errF } from "@/lib/errors";
import { AbsPath } from "@/lib/paths";
import * as Comlink from "comlink";
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", function (event: ExtendableEvent) {
  return event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener("activate", function (event) {
  return event.waitUntil(self.clients.claim()); // Become available to all pages
});

class WorkspaceStore {
  Store = {
    currentWorkspace: null as Workspace | null,
    queue: [] as [resolve: (workspace: Workspace) => void, reject: (reason?: unknown) => void][],
  };

  setWorkspace(ws: Workspace) {
    this.Store.currentWorkspace = ws;
    while (this.Store.queue.length) {
      const item = this.Store.queue.pop();
      if (item) {
        const [resolve] = item;
        resolve(ws);
      }
    }
  }
  unsetWorkspace() {
    this.Store.currentWorkspace = null;
    while (this.Store.queue.length) {
      const item = this.Store.queue.pop();
      if (item) {
        const [_, reject] = item;
        reject();
      }
    }
  }

  async awaitWorkspace() {
    if (!this.Store.currentWorkspace) {
      console.log("SW: awaiting workspace");
      return new Promise<Workspace>((resolve, reject) => {
        this.Store.queue.push([resolve, reject]);
      });
    } else {
      console.log(`SW: workspace mounted ${this.Store.currentWorkspace.id} `);
      return this.Store.currentWorkspace;
    }
  }
  peekWorkspace() {
    return this.Store.currentWorkspace;
  }
}

const workspaceStore = new WorkspaceStore();

const Methods = {
  mountWorkspace: async (workspaceId: string) => {
    if (workspaceStore.peekWorkspace() && workspaceStore.peekWorkspace()?.id === workspaceId) {
      console.warn("SW: Workspace already mounted");
      return;
    }
    WorkspaceDAO.fetchFromNameAndInit(workspaceId).then((workspace) => {
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      console.log("SW: Mounting workspace:" + workspaceId);
      workspaceStore.setWorkspace(workspace);
    });
  },
  async index() {
    if (!(await workspaceStore.awaitWorkspace())) {
      console.warn("SW: reindex / workspace not found");
      return;
    }
    const workspace = await workspaceStore.awaitWorkspace();
    await workspace.disk.index();
  },
  unmountWorkspace: async (workspaceId: string) => {
    const workspace = await workspaceStore.awaitWorkspace();
    if (!workspace) {
      console.warn("SW: unmountWorkspace / Workspace not found");
    } else {
      console.log("SW: Unmounting workspace:" + workspaceId);
      await workspace.teardown();
      workspaceStore.unsetWorkspace();
    }
  },
};

export type RemoteObj = Comlink.Remote<typeof Methods>;

self.addEventListener("message", (event) => {
  if (event.data.comlinkInit) {
    Comlink.expose(Methods, event.data.port);
    return;
  }
});

self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);
  if (event.request.destination === "image" && !url.pathname.startsWith("/icons")) {
    const pathname = decodeURIComponent(url.pathname);
    console.log(`SW: Intercepted request for: ${url.pathname}`);

    if (!workspaceStore.awaitWorkspace()) {
      throw new Error("No workspace mounted");
    }

    event.respondWith(
      (async function retry() {
        try {
          const workspace = await workspaceStore.awaitWorkspace();

          await workspace.disk.awaitFirstIndex();
          const { eTag } = workspace.disk.nodeFromPath(AbsPath.New(pathname)) ?? {};

          try {
            const contents = await workspace.disk.readFile(AbsPath.New(pathname));

            if (contents) {
              // Determine the content type based on the file extension or other logic
              const contentType = "image/jpeg"; // Adjust as needed
              const requestETag = event.request.headers.get("If-None-Match");

              if (requestETag === eTag) {
                // If the ETag matches, return a 304 Not Modified response
                return new Response(null, {
                  status: 304,
                  statusText: "Not Modified",
                });
              }

              // Create a Response object with the binary data and ETag
              return new Response(contents, {
                headers: {
                  "Content-Type": contentType,
                  ...(eTag ? { ETag: eTag } : {}), // Include the ETag in the response headers
                  "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
                },
              });
            } else {
              // If no data is found, fall back to fetching the original request
              return await fetch(event.request);
            }
          } catch (error) {
            console.error(errF`Error reading file from workspace: ${error}`);
            // console.log(JSON.stringify(workspace.disk.fileTree));
            // In case of an error, fall back to fetching the original request
            return fetch(event.request);
          }
        } catch (error) {
          console.error(errF`Error accessing workspace: ${error}`);
          // In case of an error, fall back to fetching the original request
          return fetch(event.request);
        }
      })()
    );
  }
});
