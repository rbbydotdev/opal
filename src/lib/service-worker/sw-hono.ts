import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ENV } from "@/lib/env";
import { BadRequestError, errF, isError, NotFoundError } from "@/lib/errors/errors";
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

initializeGlobalLogger(RemoteLoggerLogger("ServiceWorker"));

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
const workspaceValidator = (options: { required?: boolean } = {}, ...extractors: Array<(c: any) => string | null>) => {
  return async (c: any, next: () => Promise<void>) => {
    let workspaceName: string | null = null;

    for (const extractor of extractors) {
      workspaceName = extractor(c);
      if (workspaceName) break;
    }

    if (options.required && !workspaceName) {
      return c.json({ error: "Workspace name could not be determined" }, 400);
    }

    c.set("workspaceName", workspaceName);
    await next();
  };
};

// Individual extractor functions for composition
const extractFromSearchParams = (c: any) => {
  const url = new URL(c.req.url);
  return url.searchParams.get("workspaceName");
};

const extractFromUrlPath = (c: any) => extractWorkspaceFromUrl(c.req.url);

const extractFromReferrer = (c: any) => {
  const referrer = c.req.header("referer");
  return extractWorkspaceFromReferrer(referrer);
};

const extractFromPathParam = (c: any) => c.req.param("workspaceName");

// Pre-composed validators for common cases
const requireWorkspaceFromParam = workspaceValidator({ required: true }, extractFromPathParam);
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
const resolveWorkspaceOptional = workspaceValidator(
  { required: false },
  extractFromSearchParams,
  extractFromUrlPath,
  extractFromReferrer,
  extractFromPathParam
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

// Middleware for request signaling
app.use("*", async (c, next) => {
  signalRequest({ type: REQ_SIGNAL.START });
  try {
    await next();
  } finally {
    signalRequest({ type: REQ_SIGNAL.END });
  }
});

// Error handler middleware
app.onError((err, c) => {
  logger.error(`Handler error: ${err.message}`);

  if (isError(err, BadRequestError)) {
    return c.json({ error: "Validation error", details: err.message }, 400);
  }

  if (isError(err, NotFoundError)) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ error: "Internal server error" }, 500);
});

// Route handlers using Hono best practices

// Image upload handler
app.post("/upload-image/*", resolveWorkspaceFromAny, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
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
app.post("/upload-docx/*", resolveWorkspaceFromAny, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
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
app.post("/upload-markdown/*", resolveWorkspaceFromAny, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
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
  resolveWorkspaceFromQueryOrContext,
  zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
  async (c) => {
    try {
      const workspaceName = c.get("workspaceName");
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
  resolveWorkspaceFromQueryOrContext,
  zValidator("json", z.array(z.tuple([z.string(), z.string()]))),
  async (c) => {
    try {
      const workspaceName = c.get("workspaceName");
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
app.post("/download-encrypted.zip", resolveWorkspaceFromQueryOrContext, async (c) => {
  try {
    const workspaceName = c.get("workspaceName");
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

// Image handler using Hono pattern matching
app.get("*{.*\\.(jpg|jpeg|png|webp|svg)}", resolveWorkspaceFromQueryOrContext, async (c) => {
  const workspaceName = c.get("workspaceName");
  const url = new SuperUrl(c.req.url);
  const request = c.req.raw;

  if (request.destination === "image" || url.decodedPathname.match(/\.(jpg|jpeg|png|webp|svg)$/i)) {
    logger.log(`Handling image request for: ${url.pathname}`);

    // Check cache first for non-SVG files
    let cache: Cache | undefined;
    if (!url.decodedPathname.endsWith(".svg")) {
      cache = await Workspace.newCache(workspaceName).getCache();
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        logger.log(`Cache hit for: ${url.href.replace(url.origin, "")}`);
        return cachedResponse;
      }
    }

    // Get image from pure function
    const isThumbnail = Thumb.isThumbURL(url);
    const imageResult = await handleImageRequest(url.decodedPathname, workspaceName, isThumbnail);

    const response = new Response(imageResult.contents as BodyInit, {
      headers: {
        "Content-Type": imageResult.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    // Cache the response for non-SVG files
    if (cache && !url.decodedPathname.endsWith(".svg")) {
      await cache.put(request, response.clone());
    }

    return response;
  }

  // Fallback to network
  return fetch(request);
});

// Service Worker Event Handlers
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(self.skipWaiting());
});

// Fetch event handler
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip static files
  if (url.pathname.startsWith("/@static/")) {
    return;
  }

  logger.log(`Fetch event for: ${request.url} | Mode: ${request.mode} | Destination: ${request.destination}`);

  // Only handle requests from our host URLs
  if (!ENV.HOST_URLS.some((hostUrl) => url.origin === hostUrl)) {
    logger.log(`Bypassing fetch for non-host URL: ${request.url}`);
    return;
  }

  const whiteListMatch = WHITELIST.some((item) => item.test(url, request));

  // Handle navigation requests
  if (request.mode === "navigate" || !request.referrer) {
    logger.log(`Handling navigation request for: ${request.url}`);
    return;
  }

  // Skip whitelisted requests or script requests
  if (!request.referrer || whiteListMatch || event.request.destination === "script") {
    return;
  }

  try {
    logger.log(`Routing request through Hono: ${request.url}`);
    event.respondWith(app.fetch(request));
  } catch (e) {
    logger.error(
      errF`Error in fetch controller: ${request.url}. Referrer: ${request.referrer}. Error: ${e}`.toString()
    );
    return;
  }
});
