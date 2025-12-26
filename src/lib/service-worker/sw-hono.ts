import { zValidator } from "@hono/zod-validator";
import { Context, Hono } from "hono";
import { logger } from "hono/logger";
import { handle } from "hono/service-worker";
import { z } from "zod";

import { ENV } from "@/lib/env";
import { BadRequestError, isError, NotFoundError } from "@/lib/errors/errors";
import { initializeGlobalLogger } from "@/lib/initializeGlobalLogger";
import { absPath } from "@/lib/paths2";
import { REQ_SIGNAL } from "@/lib/service-worker/request-signal-types";
import { RemoteLoggerLogger, signalRequest, WHITELIST } from "@/lib/service-worker/utils";
import { Workspace } from "@/workspace/Workspace";

// Import pure handler functions
import { Thumb } from "@/data/Thumb";
import { EncHeader, PassHeader } from "@/lib/service-worker/downloadEncryptedZipHelper";
import { downloadZipSchema } from "@/lib/service-worker/downloadZipURL";
import { handleDocxConvertRequest } from "@/lib/service-worker/handleDocxConvertRequest";
import { handleDownloadRequest } from "@/lib/service-worker/handleDownloadRequest";
import { handleDownloadRequestEncrypted } from "@/lib/service-worker/handleDownloadRequestEncrypted";
import { handleFaviconRequest } from "@/lib/service-worker/handleFaviconRequest";
import { handleFileReplace } from "@/lib/service-worker/handleFileReplace";
import { handleImageRequest } from "@/lib/service-worker/handleImageRequest";
import { handleImageUpload } from "@/lib/service-worker/handleImageUpload";
import { handleMdImageReplace } from "@/lib/service-worker/handleMdImageReplace";
import { handleStyleSheetRequest } from "@/lib/service-worker/handleStyleSheetRequest";
import { handleWorkspaceFilenameSearch } from "@/lib/service-worker/handleWorkspaceFilenameSearch";
import { handleWorkspaceSearch } from "@/lib/service-worker/handleWorkspaceSearch";
import { SuperUrl } from "@/lib/service-worker/SuperUrl";

declare const self: ServiceWorkerGlobalScope;
const LOG = RemoteLoggerLogger("SW");

initializeGlobalLogger(LOG);

const app = new Hono<{ Variables: { workspaceName: string } }>();

// Workspace extractors - pure functions for different sources
const extractWorkspaceFromUrl = (url: string): string | null => {
  try {
    const urlResult = Workspace.parseWorkspacePath(url);
    return urlResult.workspaceName;
  } catch {
    return null;
  }
};

const extractWorkspaceFromReferrer = (referrer: string | undefined): string | null => {
  if (!referrer) return null;
  try {
    // Try referrer search params first
    const referrerUrl = new URL(referrer);
    const fromSearchParams = referrerUrl.searchParams.get("workspaceName");
    if (fromSearchParams) return fromSearchParams;

    // Try referrer path
    const referrerResult = Workspace.parseWorkspacePath(referrer);
    return referrerResult.workspaceName;
  } catch {
    return null;
  }
};

// Workspace validator middleware factory
const workspaceValidator = (
  options: { required?: boolean } = {},
  ...extractors: Array<(c: Context) => string | null>
) => {
  return async (c: Context, next: () => Promise<void>) => {
    let workspaceName: string | null = null;

    LOG.log(`[WorkspaceValidator] Processing URL: ${c.req.url}`);
    LOG.log(`[WorkspaceValidator] Referrer: ${c.req.raw.referrer}`);
    LOG.log(`[WorkspaceValidator] Headers referer: ${c.req.header("referer")}`);
    LOG.log(`[WorkspaceValidator] Raw referrer: ${c.req.raw.referrer}`);

    for (let i = 0; i < extractors.length; i++) {
      const extractor = extractors[i]!;
      workspaceName = extractor(c);
      LOG.log(`[WorkspaceValidator] Extractor ${i} result: ${workspaceName}`);
      if (workspaceName) break;
    }

    if (options.required && !workspaceName) {
      LOG.error(`[WorkspaceValidator] Failed to resolve workspace for ${c.req.url}`);
      return c.json({ error: "Workspace name could not be determined" }, 400);
    }

    LOG.log(`[WorkspaceValidator] Final workspace: ${workspaceName}`);
    c.set("workspaceName", workspaceName);
    await next();
  };
};

// Individual extractor functions for composition
const extractFromSearchParams = (c: Context) => {
  const url = new URL(c.req.url);
  return url.searchParams.get("workspaceName");
};

const extractFromUrlPath = (c: Context) => extractWorkspaceFromUrl(c.req.url);

const extractFromReferrer = (c: Context) => {
  // In service worker, referrer comes from the request object, not headers
  const referrer = c.req.raw.referrer;
  LOG.log(`Extracting from referrer: ${referrer}`);
  return extractWorkspaceFromReferrer(referrer);
};

const extractFromPathParam = (c: Context) => c.req.param("workspaceName");

const resolveWorkspaceFromAny = workspaceValidator(
  { required: true },
  extractFromSearchParams,
  extractFromUrlPath,
  extractFromReferrer,
  extractFromPathParam
);
const resolveWorkspaceFromQueryOrContext = workspaceValidator(
  { required: true },
  extractFromSearchParams,
  extractFromUrlPath,
  extractFromReferrer
);

const searchSchema = z.object({
  searchTerm: z.string(),
  regexp: z
    .union([z.boolean(), z.literal("1"), z.literal("0")])
    .optional()
    .default(true),
});

const filenameSearchSchema = z.object({
  searchTerm: z.string(),
});

const downloadEncryptedSchema = z.object({
  password: z.string(),
  encryption: z.union([z.literal("aes"), z.literal("zipcrypto")]),
});

// Hono's built-in logger middleware
app.use("*", logger(LOG.log.bind(LOG)));

// Custom logging for service worker specific info
app.use("*", async (c, next) => {
  const request = c.req.raw;
  LOG.log(
    `${c.req.method} ${c.req.url} | Mode: ${request.mode} | Destination: ${request.destination} | Referrer: ${request.referrer}`
  );
  await next();
});

// Middleware to skip static files
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith("/@static/")) {
    LOG.log(`Skipping static file: ${c.req.url}`);
    // Return a pass-through response to let the browser handle it
    return fetch(c.req.raw);
  }
  await next();
});

// Middleware to check host URLs
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (!ENV.HOST_URLS.some((hostUrl) => url.origin === hostUrl)) {
    LOG.log(`Bypassing non-host URL: ${c.req.url}`);
    // Return a pass-through response to let the browser handle it
    return fetch(c.req.raw);
  }
  await next();
});

// Middleware to skip navigation requests (except downloads)
app.use("*", async (c, next) => {
  const request = c.req.raw;
  if (c.req.path === "/download.zip") {
    return await next();
  }

  if (request.mode === "navigate" || !request.referrer) {
    LOG.log(
      `Skipping navigation/no-referrer request: ${c.req.url} | Mode: ${request.mode} | Referrer: ${request.referrer}`
    );
    // Return a pass-through response to let the browser handle it
    return fetch(c.req.raw);
  }
  await next();
});

// Middleware to check whitelist and filter requests
app.use("*", async (c, next) => {
  const request = c.req.raw;
  const url = new URL(c.req.url);
  const whiteListMatch = WHITELIST.some((item) => item.test(url, request));

  if (!request.referrer || whiteListMatch || request.destination === "script") {
    console.log(
      `Skipping filtered request: ${c.req.url} | Referrer: ${request.referrer} | WhitelistMatch: ${whiteListMatch} | Destination: ${request.destination}`
    );
    // Return a pass-through response to let the browser handle it
    return fetch(c.req.raw);
  }
  await next();
});

// Middleware for request signaling
app.use("*", async (_c, next) => {
  signalRequest({ type: REQ_SIGNAL.START });
  try {
    await next();
  } finally {
    signalRequest({ type: REQ_SIGNAL.END });
  }
});

// Error handler middleware
app.onError((err, c) => {
  LOG.error(`Handler error: ${err.message}`);

  if (isError(err, BadRequestError)) {
    return c.json({ error: "Validation error", details: err.message }, 400);
  }

  if (isError(err, NotFoundError)) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ error: "Internal server error" }, 500);
});

// Route handlers using Hono best practices

// Add a simple root route for testing
app.post("/upload-image/*", resolveWorkspaceFromAny, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
    const url = new SuperUrl(c.req.url);
    const filePath = absPath(url.decodedPathname.replace("/upload-image", ""));
    const arrayBuffer = await c.req.arrayBuffer();

    LOG.log(`Handling image upload for: ${url.pathname}`);

    const resultPath = await handleImageUpload(workspaceName, filePath, arrayBuffer);

    return new Response(resultPath, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    LOG.error(`Upload image error: ${error}`);
    throw error;
  }
});

// DOCX upload handler
app.post("/upload-docx/*", resolveWorkspaceFromAny, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
    const url = new SuperUrl(c.req.url);
    const fullPathname = absPath(url.decodedPathname.replace("/upload-docx", ""));
    const arrayBuffer = await c.req.arrayBuffer();

    LOG.log(`Handling DOCX upload for: ${fullPathname}`);

    const result = await handleDocxConvertRequest(workspaceName, fullPathname, arrayBuffer);
    return result; // Returns a Response
  } catch (error) {
    LOG.error(`Upload DOCX error: ${error}`);
    throw error;
  }
});

// Markdown upload handler
app.post("/upload-markdown/*", resolveWorkspaceFromAny, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
    const url = new SuperUrl(c.req.url);
    const fullPathname = absPath(url.decodedPathname.replace("/upload-markdown", ""));
    const arrayBuffer = await c.req.arrayBuffer();

    LOG.log(`Handling markdown upload for: ${url.pathname}`);

    const result = await handleDocxConvertRequest(workspaceName, fullPathname, arrayBuffer);
    return result;
  } catch (error) {
    LOG.error(`Upload markdown error: ${error}`);
    throw error;
  }
});

// MD image replacement handler
app.post(
  "/replace-md-images",
  resolveWorkspaceFromQueryOrContext,
  zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
  async (c) => {
    try {
      const workspaceName = c.get("workspaceName");
      const findReplacePairs = c.req.valid("json");
      const url = new SuperUrl(c.req.url);

      LOG.log(`Replacing images in MD with: ${findReplacePairs.length} pairs`);

      const result = await handleMdImageReplace(url, workspaceName, findReplacePairs);
      return result;
    } catch (error) {
      LOG.error(`Replace MD images error: ${error}`);
      throw error;
    }
  }
);

// File replacement handler
app.post(
  "/replace-files",
  resolveWorkspaceFromQueryOrContext,
  zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
  async (c) => {
    try {
      const workspaceName = c.get("workspaceName");
      const findReplacePairs = c.req.valid("json");
      const url = new SuperUrl(c.req.url);

      LOG.log(`Replacing files with: ${findReplacePairs.length} pairs`);

      const result = await handleFileReplace(url, workspaceName, findReplacePairs);
      return result;
    } catch (error) {
      LOG.error(`Replace files error: ${error}`);
      throw error;
    }
  }
);

// Workspace search handler
app.get("/workspace-search/:workspaceName", zValidator("query", searchSchema), async (c) => {
  try {
    const workspaceName = c.req.param("workspaceName");
    const { searchTerm, regexp } = c.req.valid("query");

    // Convert regexp parameter
    const regexpFlag = regexp === null ? true : regexp === "1" || regexp === true;

    LOG.log(`Handling search in '${workspaceName}' for: '${searchTerm}'`);

    const result = await handleWorkspaceSearch({ workspaceName, searchTerm, regexp: regexpFlag });
    return result;
  } catch (error) {
    LOG.error(`Workspace search error: ${error}`);
    throw error;
  }
});

// Workspace filename search handler
app.get("/workspace-filename-search/:workspaceName", zValidator("query", filenameSearchSchema), async (c) => {
  try {
    const workspaceName = c.req.param("workspaceName");
    const { searchTerm } = c.req.valid("query");

    LOG.log(`Handling filename search in '${workspaceName}' for: '${searchTerm}'`);

    const result = await handleWorkspaceFilenameSearch({ workspaceName, searchTerm });
    return result;
  } catch (error) {
    LOG.error(`Workspace filename search error: ${error}`);
    throw error;
  }
});

// Download handler
app.get("/download.zip", resolveWorkspaceFromQueryOrContext, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
    const url = new SuperUrl(c.req.url);

    // Parse search params as download payload
    const urlPayload: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      try {
        urlPayload[key] = JSON.parse(value);
      } catch {
        urlPayload[key] = value;
      }
    });

    // Validate the payload using the download schema
    const validatedPayload = downloadZipSchema.parse(urlPayload);

    LOG.log(`Handling download for: ${url.href}`);
    LOG.log(`Download payload: ${JSON.stringify(validatedPayload)}`);

    const result = await handleDownloadRequest(workspaceName, validatedPayload);
    return result;
  } catch (error) {
    LOG.error(`Download error: ${error}`);
    throw error;
  }
});

// Encrypted download handler
app.post("/download-encrypted.zip", resolveWorkspaceFromQueryOrContext, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
    const password = c.req.header(PassHeader);
    const encryption = c.req.header(EncHeader);

    if (!password || !encryption) {
      return c.json({ error: "Missing password or encryption headers" }, 400);
    }

    const options = downloadEncryptedSchema.parse({ password, encryption });

    LOG.log(`Handling encrypted download for workspace: ${workspaceName}`);

    const result = await handleDownloadRequestEncrypted(workspaceName, options);
    return result;
  } catch (error) {
    LOG.error(`Encrypted download error: ${error}`);
    throw error;
  }
});

// Favicon handler for multiple paths
app.on("GET", ["/favicon.svg", "/src/app/icon.svg", "/icon.svg"], resolveWorkspaceFromQueryOrContext, async (c) => {
  const workspaceName = c.get("workspaceName");
  const svgContent = await handleFaviconRequest(workspaceName);

  return new Response(svgContent, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
});

// CSS handler
app.get("*.css", resolveWorkspaceFromQueryOrContext, async (c) => {
  const workspaceName = c.get("workspaceName");
  const url = new SuperUrl(c.req.url);
  return handleStyleSheetRequest(url, workspaceName);
});

app.get("/:file{.+\\.(jpg|jpeg|png|webp|svg)}", resolveWorkspaceFromQueryOrContext, async (c) => {
  const workspaceName = c.get("workspaceName");
  const _filename = c.req.param("file");
  const url = new SuperUrl(c.req.url);
  const pathname = url.decodedPathname;

  // Optional: log or inspect
  LOG.log(`Handling image request for: ${pathname}`);

  const isSVG = pathname.endsWith(".svg");
  const isThumbnail = Thumb.isThumbURL(url);

  // ---------- Cache Lookup ----------
  let cache: Cache | undefined;
  if (!isSVG) {
    cache = await Workspace.newCache(workspaceName).getCache();
    const cached = await cache.match(c.req.raw);
    if (cached) {
      LOG.log(`Cache hit for: ${pathname}`);
      return cached;
    }
  }

  // ---------- Generate / Fetch Image ----------
  const image = await handleImageRequest(pathname, workspaceName, isThumbnail);
  if (!image?.contents) {
    return c.notFound();
  }

  // ---------- Build Response ----------
  const headers = {
    "Content-Type": image.mimeType,
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const res = c.newResponse(image.contents as Uint8Array<ArrayBuffer>, 200, headers);

  // ---------- Cache Store ----------
  if (cache && !isSVG) {
    await cache.put(c.req.raw, res.clone());
  }

  return res;
});

app.all("*", async (c) => {
  return fetch(c.req.raw);
});

// Service Worker Event Handlers
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

// Use Hono's built-in service worker handler
// All filtering logic is now handled by middleware
self.addEventListener("fetch", handle(app));
