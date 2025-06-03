import Identicon from "@/components/Identicon";
import { Thumb, Workspace, WorkspaceDAO } from "@/Db/Workspace";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { TreeNode } from "@/lib/FileTree/TreeNode";
import { isImageType } from "@/lib/fileType";
import { getMimeType } from "@/lib/mimeType";
import { absPath, decodePath } from "@/lib/paths2";
import { RemoteLogger } from "@/lib/RemoteLogger";
import { EncHeader, PassHeader } from "@/lib/ServiceWorker/downloadEncryptedZipHelper";
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";
import { BlobWriter, Uint8ArrayReader, ZipWriter, ZipWriterConstructorOptions } from "@zip.js/zip.js";
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

// --- Service Worker Installation and Activation ---

self.addEventListener("activate", function (event) {
  return event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  return event.waitUntil(self.skipWaiting());
});

// --- Request Signaling Helper Functions ---

function signalRequest(detail: RequestEventDetail) {
  void self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(detail);
    });
  });
}

function withRequestSignal<T extends (...args: never[]) => Promise<Response>>(handler: T) {
  return async function (...args: Parameters<T>): Promise<Response> {
    signalRequest({ type: REQ_SIGNAL.START });
    try {
      const result = await handler(...args);
      return result;
    } finally {
      signalRequest({ type: REQ_SIGNAL.END });
    }
  };
}

// --- Fetch Event Listener ---

self.addEventListener("fetch", async (event) => {
  // If no referrer, just fetch the request
  if (!event.request.referrer) {
    return event.respondWith(withRequestSignal(fetch)(event.request));
  }
  const url = new URL(event.request.url);
  let referrerPath = "";
  try {
    referrerPath = new URL(event.request.referrer).pathname;
  } catch (e) {
    console.error(`Error parsing referrer: ${event.request.referrer}, ${e}`);
    throw new NotFoundError(`Error parsing referrer ${event.request.referrer}`);
  }
  let workspaceId = null;
  try {
    workspaceId = Workspace.parseWorkspacePath(referrerPath).workspaceId;
  } catch (e) {
    console.error(errF`Error parsing workspaceId from referrer: ${referrerPath}, ${e}`.toString());
  }
  try {
    if (workspaceId && url.origin === self.location.origin) {
      if (url.pathname === "/download-encrypted.zip") {
        console.log(`Fetch event for: ${event.request.url}, referrer: ${event.request.referrer}`);
        return event.respondWith(handleDownloadRequestEncrypted(workspaceId, event));
      }
      if (url.pathname === "/download.zip") {
        return event.respondWith(handleDownloadRequest(workspaceId));
      }
      if (url.pathname === "/favicon.svg" || url.pathname === "/icon.svg") {
        return event.respondWith(withRequestSignal(handleFaviconRequest)(event));
      }
      if ((event.request.destination === "image" || isImageType(url.pathname)) && !WHITELIST.includes(url.pathname)) {
        return event.respondWith(withRequestSignal(handleImageRequest)(event, url, workspaceId));
      }
    }
  } catch (e) {
    // const stack = e && typeof e === "object" && "stack" in e ? String((e as Error).stack) : String(e);
    console.error(errF`Error handling fetch event: ${event.request.url}, ${e}`.toString());
  }

  return event.respondWith(withRequestSignal(fetch)(event.request));
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
    return fetch(event.request);
  }
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  return new Response(
    renderToString(
      React.createElement(Identicon, {
        input: workspace.guid,
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

    const contents = isThumbnail
      ? await workspace.readOrMakeThumb(decodedPathname)
      : await workspace.readFile(absPath(decodedPathname));

    const response = new Response(coerceUint8Array(contents) as BodyInit, {
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
    let fileCount = fileNodes.filter((node) => node.type === "file").length;

    signalRequest({ type: REQ_SIGNAL.START });
    await Promise.all(
      fileNodes.map(async (node) => {
        if (node.type === "file") {
          try {
            console.log(`Adding file to zip: ${node.path}`);
            const fileStream = new fflate.ZipDeflate(node.path, { level: 9 });
            zip.add(fileStream);
            //'stream' file by file
            void workspace.disk
              .readFile(node.path)
              .then((data) => {
                fileStream.push(coerceUint8Array(data), true);
              })
              .finally(() => {
                fileCount--;
                if (fileCount === 0) {
                  console.log(`All files processed for workspace: ${workspace.name}`);
                  signalRequest({ type: REQ_SIGNAL.END });
                }
              }); // true = last chunk
          } catch (e) {
            console.error(`Failed to add file to zip: ${node.path}`, e);
          }
        } else if (node.type === "dir") {
          const dirName = node.path + "/";
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

type EncryptionType = "aes" | "zipcrypto";

interface DownloadOptions {
  password: string;
  encryption: EncryptionType;
}

async function handleDownloadRequestEncrypted(workspaceId: string, event: FetchEvent): Promise<Response> {
  const options: DownloadOptions = {
    password: event.request.headers.get(PassHeader)!,
    encryption: event.request.headers.get(EncHeader)! as "aes" | "zipcrypto",
  };

  try {
    const { password, encryption } = options;
    const zipWriterOptions: ZipWriterConstructorOptions = {
      bufferedWrite: true, // Recommended for better performance with large files
    };

    zipWriterOptions.password = password;
    if (encryption === "zipcrypto") {
      zipWriterOptions.zipCrypto = true;
    } else {
      // zip.js uses encryptionStrength for AES. 3 for AES-256
      zipWriterOptions.encryptionStrength = 3; // AES-256
    }

    const workspace = await SWWStore.tryWorkspace(workspaceId);

    // zip.js ZipWriter takes a WritableStreamDefaultWriter or a WritableStream

    const zipWriter = new ZipWriter(new BlobWriter("application/zip"), zipWriterOptions);

    await workspace.disk.fileTree.index();
    const fileNodes: TreeNode[] = workspace.disk.fileTree.allNodesArray();

    if (!fileNodes || fileNodes.length === 0) {
      console.warn("{EncZip}: No files found in the workspace to download.");
      // Ensure the zipWriter is closed even if no files, to prevent hanging the stream
      await zipWriter.close();
      return new Response("No files to download", { status: 404 });
    }

    signalRequest({ type: REQ_SIGNAL.START });

    const addFilePromises = fileNodes
      .filter((node) => node.type === "file")
      .map(async (node) => {
        try {
          const data = await workspace.disk.readFile(node.path);
          await zipWriter.add(
            node.path,
            new Uint8ArrayReader(coerceUint8Array(data)),
            {
              useWebWorkers: false,
            }
            // No need to pass password/encryption here if set on ZipWriter constructor
          );

          return { status: "fulfilled", path: node.path }; // Indicate success
        } catch (e) {
          console.error(`{EncZip}: [ZIP Error] Failed to add file to zip: ${node.path}`, e);
          return { status: "rejected", path: node.path, reason: e }; // Indicate failure
        }
      });

    // Explicitly add empty directories if they don't contain files that will be added.
    // If a directory is part of a file's path (e.g., 'foo/bar/file.txt'),
    // zip.js will automatically create 'foo/' and 'foo/bar/' entries.
    // This part is mostly for truly empty directories you want to appear.
    const addDirPromises = fileNodes
      .filter((node) => node.type === "dir")
      .map(async (node) => {
        const dirName = node.path.endsWith("/") ? node.path : node.path + "/";
        try {
          // Add a 0-byte entry with a trailing slash to represent an empty directory
          await zipWriter.add(dirName, new Uint8ArrayReader(new Uint8Array(0)));

          return { status: "fulfilled", path: node.path };
        } catch (e) {
          console.error(`{EncZip}: [ZIP Error] Failed to add directory: ${node.path}`, e);
          return { status: "rejected", path: node.path, reason: e };
        }
      });

    const results = await Promise.allSettled([...addFilePromises, ...addDirPromises]);

    const rejectedFiles = results.filter((result) => result.status === "rejected");
    if (rejectedFiles.length > 0) {
      console.error("{EncZip}: [ZIP Error] Some files/directories failed to add to the zip:", rejectedFiles);
      // Depending on your requirements, you might want to throw an error here
      // or still proceed with a partial zip. For now, we proceed to close.
    } else {
    }

    // Close the zip writer AFTER all files have been attempted to be added

    signalRequest({ type: REQ_SIGNAL.END });

    return new Response(await zipWriter.close(), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${workspace.name}.zip"`,
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      console.error("{EncZip}: Workspace not found error:", e);
      return new Response("Error: Workspace not found", { status: 404 });
    }
    console.error(`{EncZip}: Uncaught error in handleDownloadRequestEncrypted:`, e);
    // Attempt to return a response even if an error occurs to prevent hanging
    return new Response(`Error during download: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}
