import { Workspace } from "@/Db/Workspace";
import { IdenticonStr } from "@/components/IndenticonStr";
import { SWWStore } from "./SWWStore";

export async function handleFaviconRequest(event: FetchEvent): Promise<Response> {
  const referrerPath = new URL(event.request.referrer).pathname;
  Workspace.parseWorkspacePath(referrerPath);
  const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
  if (!workspaceId) {
    return fetch(event.request);
  }
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  return new Response(
    IdenticonStr({
      input: workspace.guid,
      size: 4, // Grid size
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
