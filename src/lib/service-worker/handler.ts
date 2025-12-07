import { isImageType } from "@/lib/fileType";
import { absPath } from "@/lib/paths2";
import { EncHeader, PassHeader } from "@/lib/service-worker/downloadEncryptedZipHelper";
import { handleDocxConvertRequest as handleDocxUploadRequest } from "@/lib/service-worker/handleDocxConvertRequest";
import { downloadZipSchema, handleDownloadRequest } from "@/lib/service-worker/handleDownloadRequest";
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
import z from "zod";
import { withRequestSignal } from "./utils"; // Assuming utils are in the same dir

// --- Handler Context ---
export interface RequestContext {
  event: FetchEvent;
  url: SuperUrl;
  workspaceName: string;
  params: Record<string, string>;
  searchParams: Record<string, unknown>;
}

// --- Route Handlers ---

export const uploadImageHandler = withRequestSignal((context: RequestContext) => {
  const { event, url, workspaceName } = context;
  const filePath = absPath(url.decodedPathname.replace("/upload-image", ""));
  console.log(`Handling image upload for: ${url.pathname}`);

  return handleImageUpload(event, url, filePath, workspaceName);
});

export const convertDocxHandler = withRequestSignal(async (context: RequestContext) => {
  const { event, url, workspaceName } = context;

  const fullPathname = absPath(url.decodedPathname.replace("/upload-docx", ""));
  console.log(`Handling DOCX upload for: ${fullPathname}`);

  return handleDocxUploadRequest(workspaceName, fullPathname, await event.request.arrayBuffer());
});

export const workspaceSearchHandler = withRequestSignal(async (context: RequestContext) => {
  const { params, searchParams } = context;
  const workspaceName = params.workspaceName;
  const searchTerm = searchParams.searchTerm as string | null;
  const regexpParam = searchParams.regexp;
  // const searchTerm = url.searchParams.get("searchTerm");
  // const regexpParam = url.searchParams.get("regexp");
  const regexp = regexpParam === null ? true : regexpParam === "1";

  if (!workspaceName) {
    return new Response("Workspace name parameter is required.", { status: 400 });
  }
  if (searchTerm === null) {
    return new Response("Search term is required.", { status: 400 });
  }

  console.log(`Handling search in '${workspaceName}' for: '${searchTerm}'`);
  return handleWorkspaceSearch({ workspaceName, searchTerm, regexp });
});

export const workspaceFilenameSearchHandler = withRequestSignal(async (context: RequestContext) => {
  const { url, params } = context;
  const workspaceName = params.workspaceName;
  const searchTerm = url.searchParams.get("searchTerm");

  if (!workspaceName) {
    return new Response("Workspace name parameter is required.", { status: 400 });
  }
  if (searchTerm === null) {
    return new Response("Search term is required.", { status: 400 });
  }

  console.log(`Handling filename search in '${workspaceName}' for: '${searchTerm}'`);
  return handleWorkspaceFilenameSearch({ workspaceName, searchTerm });
});

export const downloadHandler = (context: RequestContext) => {
  console.log(`Handling download for: ${context.url.href}`);
  const paramsPayload = downloadZipSchema.parse(context.params || { type: "workspace" });
  return handleDownloadRequest(context.workspaceName, paramsPayload);
};

export const faviconHandler = withRequestSignal((context: RequestContext) => {
  console.log(`Handling favicon request for: ${context.url.href}`);
  return handleFaviconRequest(context.workspaceName);
});

export const styleSheetHandler = withRequestSignal((context: RequestContext) => {
  const { url, workspaceName } = context;
  console.log(`Handling stylesheet request for: ${url.href}`);
  return handleStyleSheetRequest(url, workspaceName);
});
export const imageHandler = withRequestSignal((context: RequestContext) => {
  const { event, url, workspaceName } = context;

  if (event.request.destination === "image" || isImageType(url.decodedPathname)) {
    console.log(`Handling image request for: ${url.pathname}`);
    return handleImageRequest(event.request, url, workspaceName);
  }
  // Fallback to network if it's not a match we handle
  return fetch(event.request);
});

export const defaultFetchHandler = withRequestSignal((event: FetchEvent) => {
  return fetch(event.request);
});

export const replaceMdImageHandler = withRequestSignal(async (context: RequestContext) => {
  const { url, workspaceName } = context;
  console.log(`Handling MD image replacement for: ${workspaceName}`);
  //parse json bod
  const body = await context.event.request.json();
  if (!Array.isArray(body)) {
    return new Response("Invalid request body. Expected an array of [find, replace] pairs.", { status: 400 });
  }

  const findReplace: [string, string][] = body as [string, string][];
  console.log(`Replacing images in MD with: ${findReplace.length} pairs`);

  return handleMdImageReplace(url, workspaceName, findReplace);
});

export const replaceFileHandler = withRequestSignal(async (context: RequestContext) => {
  const { url, workspaceName } = context;
  console.log(`Handling file replacement for: ${workspaceName}`);
  //parse json body
  const body = await context.event.request.json();
  if (!Array.isArray(body)) {
    return new Response("Invalid request body. Expected an array of [find, replace] pairs.", { status: 400 });
  }

  const findReplace: [string, string][] = body as [string, string][];
  console.log(`Replacing files with: ${findReplace.length} pairs`);

  return handleFileReplace(url, workspaceName, findReplace);
});

export const downloadEncryptedHandler = (context: RequestContext) => {
  console.log(`Handling encrypted download for: ${context.url.href}`);
  const options = downloadEncSchema.parse({
    password: context.event.request.headers.get(PassHeader),
    encryption: context.event.request.headers.get(EncHeader),
  });
  return handleDownloadRequestEncrypted(context.workspaceName, options);
};

const downloadEncSchema = z.object({
  password: z.string(),
  encryption: z.union([z.literal("aes"), z.literal("zipcrypto")]),
});
