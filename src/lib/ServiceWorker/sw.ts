import Identicon from "@/components/Identicon";
import { Thumb, Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { absPath2, decodePath, toString } from "@/lib/paths2";
import { RemoteLogger } from "@/lib/RemoteLogger";
import * as fflate from "fflate";
import React from "react";
import { renderToString } from "react-dom/server";

const WHITELIST = ["/opal.svg", "/favicon.ico", "/icon.svg", "/opal-lite.svg"];

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

const RL = RemoteLogger("ServiceWorker");
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
    // return event.respondWith(fetch(event.request));
  }
  try {
    const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
    if (workspaceId && url.origin === self.location.origin) {
      if (url.pathname === "/download.zip") {
        return event.respondWith(handleDownloadRequest(workspaceId));
      }
      if (url.pathname === "/favicon.svg" || url.pathname === "/icon.svg") {
        return event.respondWith(handleFaviconRequest(event));
      }
      if ((event.request.destination === "image" || isImageType(url.pathname)) && !WHITELIST.includes(url.pathname)) {
        return event.respondWith(handleImageRequest(event, url, workspaceId));
      }
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

async function handleFaviconRequest(event: FetchEvent): Promise<Response> {
  const referrerPath = new URL(event.request.referrer).pathname;
  Workspace.parseWorkspacePath(referrerPath);
  const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
  if (!workspaceId) {
    return event.respondWith(fetch(event.request));
  }
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  return new Response(
    renderToString(
      React.createElement(Identicon, {
        input: workspace.guid,
        // input: "FFFZZZ333RR44411111",
        size: 4,
      })
    ),
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

async function handleImageRequest(event: FetchEvent, url: URL, workspaceId: string): Promise<Response> {
  try {
    const decodedPathname = decodePath(url.pathname);
    const isThumbnail = Thumb.isThumbURL(url);
    console.log(`Intercepted request for: 
    decodedPathname: ${decodedPathname}
    url.pathname: ${url.pathname}
    href: ${url.href}
    isThumbnail: ${isThumbnail}
  `);
    let cache: Cache;
    if (!decodedPathname.endsWith(".svg")) {
      cache = await Workspace.newCache(workspaceId).getCache();
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        console.log(`Cache hit for: ${url.href.replace(url.origin, "")}`);
        return cachedResponse;
      }
    }
    console.log(`Cache miss for: ${url.href.replace(url.origin, "")}, fetching from workspace`);
    const workspace = await SWWStore.tryWorkspace(workspaceId);

    if (!workspace) throw new Error("Workspace not found " + workspaceId);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    const contents: Uint8Array<ArrayBufferLike> = isThumbnail
      ? ((await workspace.readOrMakeThumb(decodedPathname)) as Uint8Array<ArrayBufferLike>)
      : ((await workspace.readFile(absPath2(decodedPathname))) as Uint8Array<ArrayBufferLike>);

    const response = new Response(contents, {
      headers: {
        "Content-Type": getMimeType(decodedPathname),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    if (!decodedPathname.endsWith(".svg")) {
      await cache!.put(event.request, response.clone());
    }
    return response;
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}

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

    await workspace.disk.fileTree.index();
    const fileNodes: TreeNode[] = workspace.disk.fileTree.allNodesArray();

    if (!fileNodes || fileNodes.length === 0) {
      console.warn("No files found in the workspace to download.");
      return new Response("No files to download", { status: 404 });
    }

    await Promise.all(
      fileNodes.map(async (node) => {
        if (node.type === "file") {
          try {
            console.log(`Adding file to zip: ${toString(node.path)}`);
            const fileStream = new fflate.ZipDeflate(toString(node.path), { level: 9 });
            zip.add(fileStream);
            void workspace.disk.readFile(node.path).then((data) => fileStream.push(coerceUint8Array(data), true)); // true = last chunk
          } catch (e) {
            console.error(`Failed to add file to zip: ${toString(node.path)}`, e);
          }
        } else if (node.type === "dir") {
          const dirName = toString(node.path) + "/";
          const emptyDir = new fflate.ZipPassThrough(dirName);
          zip.add(emptyDir);
          emptyDir.push(new Uint8Array(0), true);
        }
      })
    );
    console.log(`All files added to zip for workspace: ${workspace.name}`);

    zip.end();
    console.log(`ZIP stream ended for workspace: ${workspace.name}`);

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        // "Content-Disposition": `attachment; filename="download.zip"`,
        "Content-Disposition": `attachment; filename="${workspace.name}.zip"`,
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(`Error in service worker: ${e}`);
    return new Response("Error", { status: 500 });
  }
}
