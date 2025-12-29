import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors/errors";
import { getMimeType } from "@/lib/mimeType";
import { absPath } from "@/lib/paths2";
import { SWWStore } from "./SWWStore";

export async function handleStyleSheetRequest(pathname: string, workspaceName: string): Promise<Response> {
  try {
    const workspace = await SWWStore.tryWorkspace(workspaceName);

    if (!workspace) throw new Error("Workspace not found " + workspaceName);

    const contents = await workspace.readFile(absPath(pathname));

    const response = new Response(coerceUint8Array(contents) as BodyInit, {
      headers: {
        "Content-Type": getMimeType(pathname),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    return response;
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    logger.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
