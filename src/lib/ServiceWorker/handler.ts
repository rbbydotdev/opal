import { isImageType } from "@/lib/fileType";
import { absPath, decodePath } from "@/lib/paths2";
import { handleDocxConvertRequest as handleDocxUploadRequest } from "@/lib/ServiceWorker/handleDocxConvertRequest";
import { handleDownloadRequest } from "@/lib/ServiceWorker/handleDownloadRequest";
import { handleDownloadRequestEncrypted } from "@/lib/ServiceWorker/handleDownloadRequestEncrypted";
import { handleFaviconRequest } from "@/lib/ServiceWorker/handleFaviconRequest";
import { handleImageRequest } from "@/lib/ServiceWorker/handleImageRequest";
import { handleImageUpload } from "@/lib/ServiceWorker/handleImageUpload";
import { handleWorkspaceSearch } from "@/lib/ServiceWorker/handleWorkspaceSearch";
import { WHITELIST, withRequestSignal } from "./utils"; // Assuming utils are in the same dir

// --- Handler Context ---
export interface RequestContext {
  event: FetchEvent;
  url: URL;
  workspaceId: string;
  params: Record<string, string>;
}

// --- Route Handlers ---

export const uploadImageHandler = withRequestSignal((context: RequestContext) => {
  const { event, url, workspaceId } = context;
  const filePath = absPath(decodePath(url.pathname).replace("/upload-image", ""));
  console.log(`Handling image upload for: ${url.pathname}`);

  return handleImageUpload(event, url, filePath, workspaceId);
});

export const convertDocxHandler = withRequestSignal(async (context: RequestContext) => {
  const { event, url, workspaceId } = context;

  const docPathname = absPath(decodePath(url.pathname).replace("/upload-image", ""));

  return handleDocxUploadRequest(workspaceId, docPathname, await event.request.arrayBuffer());
});

export const workspaceSearchHandler = withRequestSignal(async (context: RequestContext) => {
  const { url, params } = context;
  const workspaceName = params.workspaceName;
  const searchTerm = url.searchParams.get("searchTerm");

  if (!workspaceName) {
    return new Response("Workspace name parameter is required.", { status: 400 });
  }
  if (searchTerm === null) {
    return new Response("Search term is required.", { status: 400 });
  }

  console.log(`Handling search in '${workspaceName}' for: '${searchTerm}'`);
  return handleWorkspaceSearch({ workspaceName, searchTerm });
});

export const downloadEncryptedHandler = (context: RequestContext) => {
  console.log(`Handling encrypted download for: ${context.url.href}`);
  return handleDownloadRequestEncrypted(context.workspaceId, context.event);
};

export const downloadHandler = (context: RequestContext) => {
  console.log(`Handling download for: ${context.url.href}`);
  return handleDownloadRequest(context.workspaceId);
};

export const faviconHandler = withRequestSignal((context: RequestContext) => {
  console.log(`Handling favicon request for: ${context.url.href}`);
  return handleFaviconRequest(context.event);
});

export const imageHandler = withRequestSignal((context: RequestContext) => {
  const { event, url, workspaceId } = context;
  if ((event.request.destination === "image" || isImageType(url.pathname)) && !WHITELIST.includes(url.pathname)) {
    console.log(`Handling image request for: ${url.pathname}`);
    return handleImageRequest(event, url, workspaceId);
  }
  // Fallback to network if it's not a match we handle
  return fetch(event.request);
});

export const defaultFetchHandler = withRequestSignal((event: FetchEvent) => {
  return fetch(event.request);
});
