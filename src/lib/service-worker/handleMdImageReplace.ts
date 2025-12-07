import { errF, isError, NotFoundError } from "@/lib/errors/errors";
import { SuperUrl } from "./SuperUrl";
import { SWWStore } from "./SWWStore";

export async function handleMdImageReplace(
  url: SuperUrl,
  workspaceName: string,
  findReplace: [string, string][]
): Promise<Response> {
  try {
    logger.log(`Intercepted WORKSPACE IMG REPLACE request for:
    url.pathname: ${url.pathname}
    href: ${url.href}
    workspace: ${workspaceName}
  `);
    const workspace = await SWWStore.tryWorkspace(workspaceName);
    await workspace.refreshDisk();
    const resultPaths = !findReplace.length
      ? []
      : await workspace.getDisk().findReplaceImgBatch(findReplace, url.origin);

    if (!workspace) throw new Error("Workspace not found " + workspaceName);
    logger.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

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
    logger.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
