import { errF, isError, NotFoundError } from "@/lib/errors";
import { SWWStore } from "./SWWStore";

export async function handleMdImageReplace(
  url: URL,
  workspaceId: string,
  findReplace: [string, string][]
): Promise<Response> {
  try {
    console.log(`Intercepted WORKSPACE IMG REPLACE request for: 
    url.pathname: ${url.pathname}
    href: ${url.href}
    workspace: ${workspaceId}
  `);
    const workspace = await SWWStore.tryWorkspace(workspaceId);
    await workspace.rehydrateIndexCache();
    const resultPaths = !findReplace.length ? [] : await workspace.disk.findReplaceImgBatch(findReplace, url.origin);

    if (!workspace) throw new Error("Workspace not found " + workspaceId);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    return new Response(JSON.stringify(resultPaths), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
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
