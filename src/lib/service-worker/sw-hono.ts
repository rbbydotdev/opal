import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { handle } from "hono/service-worker";
import { z } from "zod";

import { ENV } from "@/lib/env";
import { logger } from "@/lib/service-worker/logger";
import { REQ_SIGNAL } from "@/lib/service-worker/request-signal-types";
import { signalRequest } from "@/lib/service-worker/utils";
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
import { handleMarkdownRender } from "@/lib/service-worker/handleMarkdownRender";
import { handleMdImageReplace } from "@/lib/service-worker/handleMdImageReplace";
import { handleStyleSheetRequest } from "@/lib/service-worker/handleStyleSheetRequest";
import { handleWorkspaceFilenameSearch } from "@/lib/service-worker/handleWorkspaceFilenameSearch";
import { handleWorkspaceSearch } from "@/lib/service-worker/handleWorkspaceSearch";
import { honoLogger2 } from "@/lib/service-worker/honoLogger2";
import { resolveWorkspaceFromQueryOrContext } from "@/lib/service-worker/resolveWorkspaceFromQueryOrContext";

declare const self: ServiceWorkerGlobalScope;

const app = new Hono<{ Variables: { workspaceName: string } }>();

const searchSchema = z.object({
  searchTerm: z.string(),
  regexp: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((val) => {
      if (val === undefined) return true; // default
      if (typeof val === "boolean") return val;
      return val === "true";
    }),
  workspaceName: z.string(),
  mode: z.enum(["content", "filename"]).optional().default("content"),
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
const workspaceNameSchema = z.object({
  workspaceName: z.string(),
});

app.use(
  "*",
  honoLogger2((...msg) => {
    logger.log(...msg);
  })
);

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

  // Skip requests from docs page - pass through to network
  const referrer = request.referrer || "";
  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);
      if (referrerUrl.pathname.startsWith("/docs")) {
        logger.log(`Bypassing docs referrer request: ${c.req.path} | referrer: ${referrer}`);
        return fetch(request);
      }
    } catch {
      // Invalid referrer URL, continue normally
    }
  }

  // Skip static assets and dev files
  const path = c.req.path;
  if (
    path.startsWith("/@") || // Vite special files (@vite/client, @static/, etc.)
    path.startsWith("/node_modules/") || // Vite deps
    path.startsWith("/src/") || // Source files
    path === "/sadmac.jpg" ||
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

const _Handlers = {
  UploadImage: app.post(
    "/upload-image/:filePath{.+}",
    zValidator("query", workspaceNameSchema),
    zValidator(
      "form",
      z.object({
        file: z.instanceof(File),
      })
    ),
    zValidator("param", z.object({ filePath: z.string() })),
    async (c) => {
      try {
        const { workspaceName } = c.req.valid("query");
        const filePath = c.req.param("filePath");
        const { file } = c.req.valid("form");
        const arrayBuffer = await file.arrayBuffer();
        logger.log(
          `[HANDLER:UploadImage] Processing upload | workspace: ${workspaceName} | path: ${filePath} | size: ${arrayBuffer.byteLength} bytes`
        );
        return c.json({ path: await handleImageUpload(workspaceName, filePath, arrayBuffer) });
      } catch (error) {
        logger.error(`Upload image error: ${error}`);
        throw error;
      }
    }
  ),

  // DOCX upload handler
  UploadDocX: app.post(
    "/upload-docx/:filePath{.+}",
    zValidator("query", workspaceNameSchema),
    zValidator(
      "form",
      z.object({
        file: z.instanceof(File),
      })
    ),
    zValidator("param", z.object({ filePath: z.string() })),
    async (c) => {
      try {
        const { workspaceName } = c.req.valid("query");
        const filePath = c.req.param("filePath");
        const { file } = c.req.valid("form");
        const arrayBuffer = await file.arrayBuffer();

        logger.log(
          `[HANDLER:UploadDocX] Processing DOCX upload | workspace: ${workspaceName} | path: ${filePath} | size: ${arrayBuffer.byteLength} bytes`
        );

        return c.json({ path: await handleDocxConvertRequest(workspaceName, filePath, arrayBuffer) });
      } catch (error) {
        logger.error(`Upload DOCX error: ${error}`);
        throw error;
      }
    }
  ),

  // Markdown upload handler
  UploadMarkdown: app.post(
    "/upload-markdown/:filePath{.+}",
    zValidator("query", workspaceNameSchema),
    zValidator(
      "form",
      z.object({
        file: z.instanceof(File), // validate the uploaded file
      })
    ),

    zValidator("param", z.object({ filePath: z.string() })),

    async (c) => {
      try {
        const { workspaceName } = c.req.valid("query");
        const filePath = c.req.param("filePath");
        const { file } = c.req.valid("form");
        const arrayBuffer = await file.arrayBuffer();

        logger.log(
          `[HANDLER:UploadMarkdown] Processing markdown upload | workspace: ${workspaceName} | path: ${filePath} | size: ${arrayBuffer.byteLength} bytes`
        );

        const path = await handleDocxConvertRequest(workspaceName, filePath, arrayBuffer);

        return c.json({ path });
      } catch (error) {
        logger.error(`Upload markdown error: ${error}`);
        throw error;
      }
    }
  ),
  // MD image replacement handler
  ReplaceMarkdown: app.post(
    "/replace-md-images",
    zValidator("query", workspaceNameSchema),
    zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
    async (c) => {
      try {
        const { workspaceName } = c.req.valid("query");
        const findReplacePairs = c.req.valid("json");
        logger.log(
          `[HANDLER:ReplaceMarkdown] Processing MD image replacement | workspace: ${workspaceName} | pairs: ${findReplacePairs.length}`
        );
        return c.json({
          paths: await handleMdImageReplace(workspaceName, findReplacePairs, new URL(c.req.url).origin),
        });
      } catch (error) {
        logger.error(`Replace MD images error: ${error}`);
        throw error;
      }
    }
  ),
  // File replacement handler
  ReplaceFiles: app.post(
    "/replace-files",
    zValidator("query", workspaceNameSchema),
    zValidator("json", z.object({ paths: z.array(z.tuple([z.string(), z.string()])) })),
    async (c) => {
      try {
        const { workspaceName } = c.req.valid("query");
        const { paths } = c.req.valid("json");
        logger.log(
          `[HANDLER:ReplaceFiles] Processing file replacement | workspace: ${workspaceName} | pairs: ${paths.length}`
        );
        return c.json({ paths: await handleFileReplace(new URL(c.req.url), workspaceName, paths) });
      } catch (error) {
        logger.error(`Replace files error: ${error}`);
        throw error;
      }
    }
  ),
  // Workspace search handler
  WorkspaceSearch: app.get("/workspace-search", zValidator("query", searchSchema), async (c) => {
    try {
      const { searchTerm, regexp, mode, workspaceName } = c.req.valid("query");
      logger.log(
        `[HANDLER:WorkspaceSearch] Processing search | workspace: ${workspaceName} | term: '${searchTerm}' | mode: ${mode} | regexp: ${regexp}`
      );
      return await handleWorkspaceSearch({ workspaceName, searchTerm, regexp, mode });
    } catch (error) {
      logger.error(`Workspace search error: ${error}`);
      throw error;
    }
  }),
  // Workspace filename search handler
  WorkspaceFileNameSearch: app.get(
    "/workspace-filename-search/:workspaceName",
    zValidator("query", filenameSearchSchema),
    zValidator("param", z.object({ workspaceName: z.string() })),
    async (c) => {
      try {
        const workspaceName = c.req.param("workspaceName");
        const { searchTerm } = c.req.valid("query");
        logger.log(
          `[HANDLER:WorkspaceFileNameSearch] Processing filename search | workspace: ${workspaceName} | term: '${searchTerm}'`
        );
        return await handleWorkspaceFilenameSearch({ workspaceName, searchTerm });
      } catch (error) {
        logger.error(`Workspace filename search error: ${error}`);
        throw error;
      }
    }
  ),
  // Markdown render handler
  MarkdownRender: app.get("/markdown-render", zValidator("query", markdownRenderSchema), async (c) => {
    const { workspaceName, documentId, editId } = c.req.valid("query");
    logger.log(
      `[HANDLER:MarkdownRender] Processing markdown render | workspace: ${workspaceName} | doc: ${documentId} | edit: ${editId}`
    );
    return handleMarkdownRender(c.req.raw, workspaceName, documentId, editId);
  }),
  // Download handler
  DownloadZip: app.get("/download.zip", zValidator("query", downloadZipSchema), async (c) => {
    try {
      const params = c.req.valid("query");

      logger.log(`[HANDLER:DownloadZip] Processing download | params: ${JSON.stringify(params)}`);

      return await handleDownloadRequest(params);
    } catch (error) {
      logger.error(`Download error: ${error}`);
      throw error;
    }
  }),
  // Encrypted download handler
  DownloadEncrypted: app.post("/download-encrypted.zip", zValidator("query", workspaceNameSchema), async (c) => {
    try {
      const { workspaceName } = c.req.valid("query");
      const password = c.req.header(PassHeader);
      const encryption = c.req.header(EncHeader);

      if (!password || !encryption) {
        return c.json({ error: "Missing password or encryption headers" }, 400);
      }

      const options = downloadEncryptedSchema.parse({ password, encryption });

      logger.log(
        `[HANDLER:DownloadEncrypted] Processing encrypted download | workspace: ${workspaceName} | encryption: ${encryption}`
      );

      const result = await handleDownloadRequestEncrypted(workspaceName, options);
      return result;
    } catch (error) {
      logger.error(`Encrypted download error: ${error}`);
      throw error;
    }
  }),
};

export type SWAppType = (typeof _Handlers)[keyof typeof _Handlers];

// Favicon handler for multiple paths
app.on("GET", ["/favicon.svg", "/src/app/icon.svg", "/icon.svg"], resolveWorkspaceFromQueryOrContext, async (c) => {
  const workspaceName = c.get("workspaceName");
  logger.log(`[HANDLER:Favicon] Processing favicon request | workspace: ${workspaceName} | path: ${c.req.path}`);
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
app.get("/:path{.*\\.css}", resolveWorkspaceFromQueryOrContext, async (c) => {
  const workspaceName = c.get("workspaceName");
  const path = c.req.param("path");
  logger.log(`[HANDLER:CSS] Processing stylesheet request | workspace: ${workspaceName} | path: ${path}`);
  return handleStyleSheetRequest(path, workspaceName);
});

app.get("/:file{.+\\.(jpg|jpeg|png|webp|svg)}", resolveWorkspaceFromQueryOrContext, async (c) => {
  const filename = c.req.param("file");
  const workspaceName = c.get("workspaceName");
  const isSVG = filename.endsWith(".svg");
  const isThumbnail = Thumb.isThumbURL(c.req.url);

  logger.log(
    `[HANDLER:Image] Processing image request | workspace: ${workspaceName} | file: ${filename} | isThumbnail: ${isThumbnail} | isSVG: ${isSVG}`
  );

  // ---------- Cache Lookup ----------
  let cache: Cache | undefined;
  if (!isSVG) {
    cache = await Workspace.newCache(workspaceName).getCache();
    const cached = await cache.match(c.req.raw);
    if (cached) {
      logger.log(`Cache hit for: ${filename}`);
      return cached;
    }
  }

  // ---------- Generate / Fetch Image ----------
  const image = await handleImageRequest(filename, workspaceName, isThumbnail);
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
  logger.log(`[HANDLER:Fallback] Bypassing to network | method: ${c.req.method} | path: ${c.req.path}`);
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
