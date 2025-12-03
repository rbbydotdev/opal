import { coerceUint8Array } from "@/lib/coerceUint8Array";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { getMimeType } from "@/lib/mimeType";
import { absPath } from "@/lib/paths2";
import { SuperUrl } from "./SuperUrl";
import { SWWStore } from "./SWWStore";

export async function handleStyleSheetRequest(url: SuperUrl, workspaceName: string): Promise<Response> {
  try {
    const decodedPathname = url.decodedPathname;
    console.log(`Intercepted request for: 
    decodedPathname: ${decodedPathname}
    url.pathname: ${url.pathname}
    href: ${url.href}
  `);
    const workspace = await SWWStore.tryWorkspace(workspaceName);

    if (!workspace) throw new Error("Workspace not found " + workspaceName);
    console.log(`Using workspace: ${workspace.name} for request: ${url.href}`);

    const contents = await workspace.readFile(absPath(decodedPathname));

    const response = new Response(coerceUint8Array(contents) as BodyInit, {
      headers: {
        "Content-Type": getMimeType(decodedPathname),
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
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
