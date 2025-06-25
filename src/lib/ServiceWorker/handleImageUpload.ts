import { Workspace } from "@/Db/Workspace";
import { createImage } from "@/lib/createImage";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { AbsPath, basename, dirname, extname } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export async function handleImageUpload(
  event: FetchEvent,
  url: URL,
  filePath: AbsPath,
  workspaceId: string
): Promise<Response> {
  try {
    const { request } = event;
    const IS_NOT_WEBP = extname(filePath) !== ".webp";
    const IS_NOT_SVG = extname(filePath) !== ".svg";
    console.log(`Intercepted UPLOAD request for: 
    url.pathname: ${url.pathname}
    href: ${url.href}
    filePath: ${filePath}
  `);
    let cache: Cache;
    if (IS_NOT_SVG) {
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

    const arrayBuffer = await request.arrayBuffer();
    let resultPath = filePath;
    if (IS_NOT_SVG && IS_NOT_WEBP) {
      const image = await createImage({ file: new File([arrayBuffer], basename(filePath)) });
      resultPath = await workspace.dropImageFile(image, dirname(filePath));
    } else {
      const file = new File([arrayBuffer], basename(filePath));
      resultPath = await workspace.dropImageFile(file, dirname(filePath));
    }

    return new Response(resultPath, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
