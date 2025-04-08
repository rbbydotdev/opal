import { Workspace, WorkspaceDAO } from "@/clientdb/Workspace";
import { AbsPath } from "@/lib/paths";
import * as Comlink from "comlink";
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", function (event: ExtendableEvent) {
  return event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener("activate", function (event) {
  return event.waitUntil(self.clients.claim()); // Become available to all pages
});

const Store = {
  currentWorkspace: null as Promise<Workspace> | null,
  queue: [] as [resolve: (workspace: Workspace) => void, reject: (reason?: unknown) => void][],
};

const Methods = {
  mountWorkspace: async (workspaceId: string) => {
    if (Store.currentWorkspace && (await Store.currentWorkspace).id === workspaceId) {
      console.warn("Workspace already mounted");
      return;
    }
    Store.currentWorkspace = WorkspaceDAO.fetchFromNameAndInit(workspaceId).then((workspace) => {
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      console.log("Mounting workspace:", workspaceId);
      return workspace;
    });
    const ws = await Store.currentWorkspace;
    while (Store.queue.length) {
      const item = Store.queue.pop();
      if (item) {
        const [resolve] = item;
        resolve(ws);
      }
    }
    return;
  },
  unmountWorkspace: async (workspaceId: string) => {
    const workspace = Store.currentWorkspace;
    if (!workspace) {
      console.warn("unmountWorkspace / Workspace not found");
    } else {
      console.log("Unmounting workspace:", workspaceId);
      await (await workspace).teardown();
      Store.currentWorkspace = null;
    }

    while (Store.queue.length) {
      const item = Store.queue.pop();
      if (item) {
        const [_, reject] = item;
        reject();
      }
    }
  },
  counter: 0,
  inc() {
    this.counter++;
  },
  task() {
    return "foobar";
  },
};

export type RemoteObj = Comlink.Remote<typeof Methods>;

self.addEventListener("message", (event) => {
  if (event.data.comlinkInit) {
    Comlink.expose(Methods, event.data.port);
    return;
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.destination === "image" && !url.pathname.startsWith("/icons")) {
    console.log(event.request);
    console.log(`Intercepted request for: ${url.pathname}`);

    if (!Store.currentWorkspace) {
      console.warn("No workspace mounted");
      return;
    }

    event.respondWith(
      (async function retry() {
        try {
          let workspace = await Store.currentWorkspace;
          if (!workspace) {
            workspace = await new Promise((rs, rj) => {
              Store.queue.push([rs, rj]);
            });
          }
          if (!workspace) {
            console.warn("Workspace not found");
            return new Response("Workspace not found", { status: 404 });
          }

          await workspace.disk.awaitFirstIndex();
          const { eTag } = workspace.disk.nodeFromPath(AbsPath.New(url.pathname)) ?? {};

          try {
            const contents = await workspace.disk.readFile(AbsPath.New(url.pathname));

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
            console.error("Error reading file from workspace:", error);
            console.log(JSON.stringify(workspace.disk.fileTree));
            // In case of an error, fall back to fetching the original request
            return fetch(event.request);
          }
        } catch (error) {
          console.error("Error accessing workspace:", error);
          // In case of an error, fall back to fetching the original request
          return fetch(event.request);
        }
      })()
    );
  }
});
