import { DiskSearchResultData } from "@/features/search/useSearchWorkspace";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { wrapGeneratorWithSignal } from "@/lib/ServiceWorker/wrapGeneratorWithSignal";
import { SWWStore } from "./SWWStore";

// Use a Map for better performance and API.
// This still lives at the module level to track searches across requests.
const activeSearches = new Map<string, AbortController>();

function makeResponse(results: DiskSearchResultData[]) {
  return new Response(JSON.stringify({ results } satisfies WorkspaceSearchResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function handleWorkspaceSearch(workspaceId: string, searchTerm: string): Promise<Response> {
  // 1. Cancel any previous search for this workspace
  activeSearches.get(workspaceId)?.abort("A new search was started.");
  const searchController = new AbortController();
  activeSearches.set(workspaceId, searchController);

  try {
    if (!searchTerm) {
      return makeResponse([]);
    }

    // 2. Combine signals for timeout and cancellation
    const timeoutSignal = AbortSignal.timeout(10_000); // 10-second timeout
    const combinedSignal = AbortSignal.any([searchController.signal, timeoutSignal]);

    const workspace = await SWWStore.tryWorkspace(workspaceId);
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`);
    }

    // TODO: Consider if `init()` is always necessary.
    // If it's expensive, you might check a 'lastIndexed' timestamp
    // and only re-initialize if data is stale.
    await workspace.init();

    const results: DiskSearchResultData[] = [];
    const scannable = workspace.NewScannable();

    // 3. Pass the signal to the search logic
    // If `search` accepts a signal, you can pass it directly:
    // const searchGenerator = scannable.search(searchTerm, { signal: combinedSignal });

    // If not, wrap the generator to make it abort-aware:
    const searchGenerator = wrapGeneratorWithSignal(scannable.search(searchTerm), combinedSignal);

    for await (const result of searchGenerator) {
      results.push(result);
    }

    return makeResponse(results);
  } catch (e) {
    // 4. Gracefully handle aborts vs. other errors
    if (e instanceof DOMException && e.name === "AbortError") {
      console.log(`Search aborted for workspace: ${workspaceId}`);
      // Return "204 No Content". The client should just ignore this
      // response, as a new search has likely already been initiated.
      return new Response(null, { status: 204 });
    }
    if (isError(e, NotFoundError)) {
      return new Response("Workspace not found", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    // 5. Robust cleanup
    // This ensures we remove the controller from the map
    // whether the search succeeds, fails, or is aborted.
    activeSearches.delete(workspaceId);
  }
}

export type WorkspaceSearchResponse = {
  results: DiskSearchResultData[];
};
