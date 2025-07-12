import { errF, isError, NotFoundError } from "@/lib/errors";
import { AbsPath } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export async function handleImageUpload(
  event: FetchEvent,
  url: URL,
  filePath: AbsPath,
  workspaceId: string
): Promise<Response> {
  try {
    const { request } = event;
    console.log(`Intercepted UPLOAD request for: 
    url.pathname: ${url.pathname}
    href: ${url.href}
    filePath: ${filePath}
  `);
    const workspace = await SWWStore.tryWorkspace(workspaceId);

    if (!workspace) throw new Error("Workspace not found " + workspaceId);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);
    const resultPath = await workspace.NewImage_DEPRECATED(await request.arrayBuffer(), filePath);

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
