import { errF, isError, NotFoundError } from "@/lib/errors";
import { AbsPath } from "@/lib/paths2";
import { SuperUrl } from "./SuperUrl";
import { SWWStore } from "./SWWStore";

export async function handleImageUpload(
  event: FetchEvent,
  url: SuperUrl,
  filePath: AbsPath,
  workspaceName: string
): Promise<Response> {
  try {
    const { request } = event;
    console.log(`Intercepted UPLOAD request for: 
    url.pathname: ${url.pathname}
    href: ${url.href}
    filePath: ${filePath}
  `);
    const workspace = await SWWStore.tryWorkspace(workspaceName);

    if (!workspace) throw new Error("Workspace not found " + workspaceName);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    // Clear image and thumbnail cache before uploading
    try {
      // Clear image cache
      const imageCache = await workspace.imageCache.getCache();
      await imageCache.delete(filePath);

      // Clear thumbnail cache (both standard size and possible variations)
      const thumbUrl = filePath + "?thumb=100";
      await imageCache.delete(thumbUrl);
    } catch (e) {
      // Silently ignore cache cleanup errors
    }

    const resultPath = await workspace.NewImage(await request.arrayBuffer(), filePath);

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
