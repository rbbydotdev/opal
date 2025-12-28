import { zValidator } from "@hono/zod-validator";
import { Context, Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { handle } from "hono/service-worker";
import { marked } from "marked";
import { z } from "zod";

import { ENV } from "@/lib/env";
import { initializeGlobalLogger } from "@/lib/initializeGlobalLogger";
import { absPath } from "@/lib/paths2";
import { REQ_SIGNAL } from "@/lib/service-worker/request-signal-types";
import { RemoteLoggerLogger, signalRequest } from "@/lib/service-worker/utils";
import { Workspace } from "@/workspace/Workspace";

// Import pure handler functions
import { ClientDb } from "@/data/db/DBInstance";
import { Thumb } from "@/data/Thumb";
import { HistoryDB } from "@/editors/history/HistoryDB";
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
import { SWWStore } from "@/lib/service-worker/SWWStore";
import graymatter from "gray-matter";

declare const self: ServiceWorkerGlobalScope;
initializeGlobalLogger(RemoteLoggerLogger("SW"));

const app = new Hono<{ Variables: { workspaceName: string } }>();

export type SWAppType = typeof app;

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

    logger.log(`[WorkspaceValidator] Processing URL: ${c.req.url}`);
    logger.log(`[WorkspaceValidator] Referrer: ${c.req.raw.referrer}`);
    logger.log(`[WorkspaceValidator] Headers referer: ${c.req.header("referer")}`);
    logger.log(`[WorkspaceValidator] Raw referrer: ${c.req.raw.referrer}`);

    for (let i = 0; i < extractors.length; i++) {
      const extractor = extractors[i]!;
      workspaceName = extractor(c);
      logger.log(`[WorkspaceValidator] Extractor ${i} result: ${workspaceName}`);
      if (workspaceName) break;
    }

    if (options.required && !workspaceName) {
      logger.error(`[WorkspaceValidator] Failed to resolve workspace for ${c.req.url}`);
      return c.json({ error: "Workspace name could not be determined" }, 400);
    }

    logger.log(`[WorkspaceValidator] Final workspace: ${workspaceName}`);
    c.set("workspaceName", workspaceName);
    await next();
  };
};

// Individual extractor functions for composition (only used by image/CSS routes)
const extractFromSearchParams = (c: Context) => {
  const url = new URL(c.req.url);
  return url.searchParams.get("workspaceName");
};

const extractFromUrlPath = (c: Context) => extractWorkspaceFromUrl(c.req.url);

const extractFromReferrer = (c: Context) => {
  // In service worker, referrer comes from the request object, not headers
  const referrer = c.req.raw.referrer;
  logger.log(`Extracting from referrer: ${referrer}`);
  return extractWorkspaceFromReferrer(referrer);
};

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

const markdownRenderSchema = z.object({
  workspaceName: z.string(),
  documentId: z.string(),
  editId: z.string().transform((val) => parseInt(val, 10)),
});

// API route schemas for pure Zod validation
const uploadImageSchema = z.object({
  workspaceName: z.string(),
});

const replaceFilesSchema = z.object({
  workspaceName: z.string(),
});

const downloadZipQuerySchema = z.object({
  workspaceName: z.string(),
});

// Hono's built-in logger middleware
app.use("*", honoLogger(logger.log.bind(logger)));

// Custom logging for service worker specific info
app.use("*", async (c, next) => {
  const request = c.req.raw;
  logger.log(
    `${c.req.method} ${c.req.url} | Mode: ${request.mode} | Destination: ${request.destination} | Referrer: ${request.referrer}`
  );
  await next();
});

// Skip requests that should bypass service worker
app.use("*", async (c, next) => {
  const request = c.req.raw;
  const url = c.req.url;

  // Skip non-host URLs
  if (!ENV.HOST_URLS.some((hostUrl) => url.startsWith(hostUrl))) {
    logger.log(`Bypassing non-host URL: ${url}`);
    return fetch(request);
  }

  // Skip navigation requests (except downloads)
  if (c.req.path !== "/download.zip" && (request.mode === "navigate" || !request.referrer)) {
    logger.log(`Skipping navigation: ${url}`);
    return fetch(request);
  }

  // Skip static assets and dev files
  const path = c.req.path;
  if (
    path.startsWith("/@") || // Vite special files (@vite/client, @static/, etc.)
    path.startsWith("/node_modules/") || // Vite deps
    path.startsWith("/src/") || // Source files
    path === "/opal.svg" ||
    path === "/opal-blank.svg" ||
    path === "/opal-lite.svg" ||
    request.destination === "script" // All script requests should bypass
  ) {
    logger.log(`Skipping dev/static file: ${path}`);
    return fetch(request);
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

// // Error handler middleware
// app.onError((err, c) => {
//   LOG.error(`Handler error: ${err.message}`);

//   if (isError(err, BadRequestError)) {
//     return c.json({ error: "Validation error", details: err.message }, 400);
//   }

//   if (isError(err, NotFoundError)) {
//     return c.json({ error: "Not found" }, 404);
//   }

//   return c.json({ error: "Internal server error" }, 500);
// });

// Route handlers using Hono best practices

// Add a simple root route for testing
app.post("/upload-image/*", zValidator("query", uploadImageSchema), async (c) => {
  try {
    const { workspaceName } = c.req.valid("query");
    const url = new SuperUrl(c.req.url);
    const filePath = absPath(url.decodedPathname.replace("/upload-image", ""));
    const arrayBuffer = await c.req.arrayBuffer();

    logger.log(`Handling image upload for: ${url.pathname}`);

    const resultPath = await handleImageUpload(workspaceName, filePath, arrayBuffer);

    return new Response(resultPath, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    logger.error(`Upload image error: ${error}`);
    throw error;
  }
});

// DOCX upload handler
app.post("/upload-docx/*", zValidator("query", uploadImageSchema), async (c) => {
  try {
    const { workspaceName } = c.req.valid("query");
    const url = new SuperUrl(c.req.url);
    const fullPathname = absPath(url.decodedPathname.replace("/upload-docx", ""));
    const arrayBuffer = await c.req.arrayBuffer();

    logger.log(`Handling DOCX upload for: ${fullPathname}`);

    const result = await handleDocxConvertRequest(workspaceName, fullPathname, arrayBuffer);
    return result; // Returns a Response
  } catch (error) {
    logger.error(`Upload DOCX error: ${error}`);
    throw error;
  }
});

// Markdown upload handler
app.post("/upload-markdown/*", zValidator("query", uploadImageSchema), async (c) => {
  try {
    const { workspaceName } = c.req.valid("query");
    const url = new SuperUrl(c.req.url);
    const fullPathname = absPath(url.decodedPathname.replace("/upload-markdown", ""));
    const arrayBuffer = await c.req.arrayBuffer();

    logger.log(`Handling markdown upload for: ${url.pathname}`);

    const result = await handleDocxConvertRequest(workspaceName, fullPathname, arrayBuffer);
    return result;
  } catch (error) {
    logger.error(`Upload markdown error: ${error}`);
    throw error;
  }
});

// MD image replacement handler
app.post(
  "/replace-md-images",
  zValidator("query", replaceFilesSchema),
  zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
  async (c) => {
    try {
      const { workspaceName } = c.req.valid("query");
      const findReplacePairs = c.req.valid("json");
      const url = new SuperUrl(c.req.url);

      logger.log(`Replacing images in MD with: ${findReplacePairs.length} pairs`);

      const result = await handleMdImageReplace(url, workspaceName, findReplacePairs);
      return result;
    } catch (error) {
      logger.error(`Replace MD images error: ${error}`);
      throw error;
    }
  }
);

// File replacement handler
app.post(
  "/replace-files",
  zValidator("query", replaceFilesSchema),
  zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
  async (c) => {
    try {
      const { workspaceName } = c.req.valid("query");
      const findReplacePairs = c.req.valid("json");
      const url = new SuperUrl(c.req.url);

      logger.log(`Replacing files with: ${findReplacePairs.length} pairs`);

      const result = await handleFileReplace(url, workspaceName, findReplacePairs);
      return result;
    } catch (error) {
      logger.error(`Replace files error: ${error}`);
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

    logger.log(`Handling search in '${workspaceName}' for: '${searchTerm}'`);

    const result = await handleWorkspaceSearch({ workspaceName, searchTerm, regexp: regexpFlag });
    return result;
  } catch (error) {
    logger.error(`Workspace search error: ${error}`);
    throw error;
  }
});

// Workspace filename search handler
app.get("/workspace-filename-search/:workspaceName", zValidator("query", filenameSearchSchema), async (c) => {
  try {
    const workspaceName = c.req.param("workspaceName");
    const { searchTerm } = c.req.valid("query");

    logger.log(`Handling filename search in '${workspaceName}' for: '${searchTerm}'`);

    const result = await handleWorkspaceFilenameSearch({ workspaceName, searchTerm });

    return result;
  } catch (error) {
    logger.error(`Workspace filename search error: ${error}`);
    throw error;
  }
});

// Markdown render handler
app.get("/markdown-render", zValidator("query", markdownRenderSchema), async (c) => {
  try {
    const { workspaceName, documentId, editId } = c.req.valid("query");

    logger.log(`Handling markdown render for workspace: ${workspaceName}, document: ${documentId}, edit: ${editId}`);

    // Get workspace to find workspaceId
    const workspace = await SWWStore.tryWorkspace(workspaceName).then((w) => w.initNoListen());
    if (!workspace) {
      logger.error(`Workspace not found: ${workspaceName}`);
      return c.json({ error: "Workspace not found" }, 404);
    }

    // ---------- Cache Lookup ----------
    const cache = await Workspace.newCache(workspaceName).getCache();
    const cached = await cache.match(c.req.raw);
    if (cached) {
      logger.log(`Cache hit for markdown render: ${editId}`);
      return cached;
    }

    // Get edit from database to check for existing preview blob
    const edit = await ClientDb.historyDocs.get(editId);
    if (!edit) {
      logger.error(`Edit not found: ${editId}`);
      return c.json({ error: "Edit not found" }, 404);
    }

    let htmlContent: string;

    // Check if edit already has preview blob
    if (edit.preview) {
      logger.log(`Using existing preview blob for edit: ${editId}`);
      htmlContent = await edit.preview.text();
    } else {
      logger.log(`Generating new HTML for edit: ${editId}`);

      // Create HistoryDB instance and reconstruct document
      const historyDB = new HistoryDB();
      const markdownContent = await historyDB.reconstructDocument({ edit_id: editId });

      // Render markdown to HTML
      htmlContent = await marked(graymatter(markdownContent).content);

      // Store rendered HTML in edit.preview Blob field
      const htmlBlob = new Blob([htmlContent], { type: "text/html" });
      await historyDB.updatePreviewForEditId(editId, htmlBlob);

      historyDB.tearDown();
    }

    // Create response
    const response = new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    // ---------- Cache Store ----------
    await cache.put(c.req.raw, response.clone());

    return response;
  } catch (error) {
    logger.error(`Markdown render error: ${error}`);
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: "Edit not found" }, 404);
    }
    throw error;
  }
});

// Download handler
app.get("/download.zip", zValidator("query", downloadZipQuerySchema), async (c) => {
  try {
    const { workspaceName } = c.req.valid("query");
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

    logger.log(`Handling download for: ${url.href}`);
    logger.log(`Download payload: ${JSON.stringify(validatedPayload)}`);

    const result = await handleDownloadRequest(workspaceName, validatedPayload);
    return result;
  } catch (error) {
    logger.error(`Download error: ${error}`);
    throw error;
  }
});

// Encrypted download handler
app.post("/download-encrypted.zip", zValidator("query", downloadZipQuerySchema), async (c) => {
  try {
    const { workspaceName } = c.req.valid("query");
    const password = c.req.header(PassHeader);
    const encryption = c.req.header(EncHeader);

    if (!password || !encryption) {
      return c.json({ error: "Missing password or encryption headers" }, 400);
    }

    const options = downloadEncryptedSchema.parse({ password, encryption });

    logger.log(`Handling encrypted download for workspace: ${workspaceName}`);

    const result = await handleDownloadRequestEncrypted(workspaceName, options);
    return result;
  } catch (error) {
    logger.error(`Encrypted download error: ${error}`);
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
  logger.log(`Handling image request for: ${pathname}`);

  const isSVG = pathname.endsWith(".svg");
  const isThumbnail = Thumb.isThumbURL(url);

  // ---------- Cache Lookup ----------
  let cache: Cache | undefined;
  if (!isSVG) {
    cache = await Workspace.newCache(workspaceName).getCache();
    const cached = await cache.match(c.req.raw);
    if (cached) {
      logger.log(`Cache hit for: ${pathname}`);
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
