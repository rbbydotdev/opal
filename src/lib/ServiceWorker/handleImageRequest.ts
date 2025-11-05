import { Thumb } from "@/data/Thumb";
import { Workspace } from "@/data/Workspace";
import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { getMimeType } from "@/lib/mimeType";
import { absPath, decodePath } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export async function handleImageRequest(event: FetchEvent, url: URL, workspaceName: string): Promise<Response> {
  // TODO hoist controller logic up to the top level
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
      cache = await Workspace.newCache(workspaceName).getCache();
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        console.log(`Cache hit for: ${url.href.replace(url.origin, "")}`);
        return cachedResponse;
      }
    }
    console.log(`Cache miss for: ${url.href.replace(url.origin, "")}, fetching from workspace name ${workspaceName}`);
    const workspace = await SWWStore.tryWorkspace(workspaceName);

    if (!workspace) throw new Error("Workspace not found " + workspaceName);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    const contents = await (isThumbnail && !decodedPathname.startsWith("/.thumb/")
      ? workspace.readOrMakeThumb(absPath(decodedPathname))
      : workspace.readFile(absPath(decodedPathname)));

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
