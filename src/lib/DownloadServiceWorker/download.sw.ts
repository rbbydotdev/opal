import { Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { TreeDir, TreeNode } from "@/lib/FileTree/TreeNode";
import { RemoteLogger } from "@/lib/ImagesServiceWorker/RemoteLogger";
import * as fflate from "fflate";

const WHITELIST: string[] = [];

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

const RL = RemoteLogger("DownloadServiceWorker");
console.log = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "log");
};

console.debug = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "debug");
};
console.error = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "error");
};
console.warn = function (msg: unknown) {
  RL(formatConsoleMsg(msg), "warn");
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
  }
  try {
    const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
    if (
      workspaceId &&
      url.origin === self.location.origin && // Only intercept local requests
      !WHITELIST.includes(url.pathname)
    ) {
      return event.respondWith(handleDownloadRequest(workspaceId));
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

async function handleDownloadRequest(workspaceId: string): Promise<Response> {
  try {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Set up the ZIP stream
    const zip = new fflate.Zip(async (err, data, final) => {
      if (err) {
        await writer.abort(err);
        return;
      }
      await writer.write(data);
      if (final) await writer.close();
    });

    const workspace = await SWWStore.tryWorkspace(workspaceId);

    const fileNodes: TreeNode[] = [];

    if (fileNodes === null || fileNodes.length === 0) {
      console.warn("No files found in the workspace to download.");
      return new Response("No files to download", { status: 404 });
    }
    for (const node of fileNodes) {
      if (node.type === "file") {
        try {
          console.log(`Adding file to zip: ${node.path.str}`);
          const fileStream = new fflate.ZipDeflate(node.path.str, { level: 6 });
          zip.add(fileStream);
          const data = coerceUint8Array(await workspace.disk.readFile(node.path));
          fileStream.push(data, true); // true = last chunk
        } catch (e) {
          // Optionally log or skip unreadable files
          console.error(`Failed to add file to zip: ${node.path.str}`, e);
        }
      } else if (node.type === "dir") {
        const dirName = node.path.str + "/";
        const emptyDir = new fflate.ZipPassThrough(dirName);
        zip.add(emptyDir);
        emptyDir.push(new Uint8Array(0), true);
      }
    }

    zip.end();

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="workspace.zip"`,
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
