import { DiskSearchResultData } from "@/features/search/useSearchWorkspace";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { SWWStore } from "./SWWStore";

function makeResponse(results: DiskSearchResultData[]) {
  return new Response(JSON.stringify({ results } satisfies WorkspaceSearchResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function handleWorkspaceSearch(workspaceId: string, searchTerm: string): Promise<Response> {
  try {
    if (!searchTerm) {
      return makeResponse([]);
    }
    const workspace = await SWWStore.tryWorkspace(workspaceId);
    if (!workspace) throw new Error("Workspace not found " + workspaceId);
    //i think i have to force a re-index every darn time!
    //may be useful to have a lastUpdate member on workspace / disk / file tree
    await workspace.init();
    const results = [];
    for await (const r of workspace.NewScannable().search(searchTerm)) {
      results.push(r);
    }
    return makeResponse(results);
  } catch (e) {
    if (isError(e, NotFoundError)) {
      return new Response("Error", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Error", { status: 500 });
  }
}
export type WorkspaceSearchResponse = {
  results: DiskSearchResultData[];
};
