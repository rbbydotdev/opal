import { isImageType } from "@/lib/fileType";
import { absPath, decodePath } from "@/lib/paths2";
import { handleDocxConvertRequest as handleDocxUploadRequest } from "@/lib/ServiceWorker/handleDocxConvertRequest";
import { handleDownloadRequest } from "@/lib/ServiceWorker/handleDownloadRequest";
import { handleDownloadRequestEncrypted } from "@/lib/ServiceWorker/handleDownloadRequestEncrypted";
import { handleFaviconRequest } from "@/lib/ServiceWorker/handleFaviconRequest";
import { handleImageRequest } from "@/lib/ServiceWorker/handleImageRequest";
import { handleImageUpload } from "@/lib/ServiceWorker/handleImageUpload";
import { handleMdImageReplace } from "@/lib/ServiceWorker/handleMdImageReplace";
import { handleStyleSheetRequest } from "@/lib/ServiceWorker/handleStyleSheetRequest";
import { handleWorkspaceSearch } from "@/lib/ServiceWorker/handleWorkspaceSearch";
import { withRequestSignal } from "./utils"; // Assuming utils are in the same dir

// --- Handler Context ---
export interface RequestContext {
  event: FetchEvent;
  url: URL;
  workspaceName: string;
  params: Record<string, string>;
  searchParams: Record<string, unknown>;
}

// --- Route Handlers ---

export const uploadImageHandler = withRequestSignal((context: RequestContext) => {
  const { event, url, workspaceName } = context;
  const filePath = absPath(decodePath(url.pathname).replace("/upload-image", ""));
  console.log(`Handling image upload for: ${url.pathname}`);

  return handleImageUpload(event, url, filePath, workspaceName);
});

export const convertDocxHandler = withRequestSignal(async (context: RequestContext) => {
  const { event, url, workspaceName } = context;

  const fullPathname = absPath(decodePath(url.pathname).replace("/upload-docx", ""));
  console.log(`Handling DOCX upload for: ${fullPathname}`);

  return handleDocxUploadRequest(workspaceName, fullPathname, await event.request.arrayBuffer());
});

export const workspaceSearchHandler = withRequestSignal(async (context: RequestContext) => {
  const { url, params } = context;
  const workspaceName = params.workspaceName;
  const searchTerm = url.searchParams.get("searchTerm");
  const regexpParam = url.searchParams.get("regexp");
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

export const downloadEncryptedHandler = (context: RequestContext) => {
  console.log(`Handling encrypted download for: ${context.url.href}`);
  return handleDownloadRequestEncrypted(context.workspaceName, context.event);
};

export const downloadHandler = (context: RequestContext) => {
  console.log(`Handling download for: ${context.url.href}`);
  return handleDownloadRequest(context.workspaceName);
};

export const faviconHandler = withRequestSignal((context: RequestContext) => {
  console.log(`Handling favicon request for: ${context.url.href}`);
  return handleFaviconRequest(context.workspaceName);
});

export const styleSheetHandler = withRequestSignal((context: RequestContext) => {
  const { url, workspaceName } = context;
  // if (event.request.destination === "document") {
  //   return fetch(event.request);
  // }
  console.log(`Handling stylesheet request for: ${url.href}`);
  return handleStyleSheetRequest(url, workspaceName);
});
export const imageHandler = withRequestSignal((context: RequestContext) => {
  const { event, url, workspaceName } = context;

  if (event.request.destination === "image" || isImageType(url.pathname)) {
    console.log(`Handling image request for: ${url.pathname}`);
    return handleImageRequest(event, url, workspaceName);
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
