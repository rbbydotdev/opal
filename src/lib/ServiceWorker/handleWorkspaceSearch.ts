import { DiskSearchResultData } from "@/features/search/useSearchWorkspace";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { wrapGeneratorWithSignal } from "@/lib/ServiceWorker/wrapGeneratorWithSignal";
import { SWWStore } from "./SWWStore";

const activeSearches = new Map<string, AbortController>();

export async function handleWorkspaceSearch(workspaceId: string, searchTerm: string): Promise<Response> {
  // 1. Cancel any previous search for this workspace. This logic remains the same.
  activeSearches.get(workspaceId)?.abort("A new search was started.");
  const searchController = new AbortController();
  activeSearches.set(workspaceId, searchController);

  try {
    if (!searchTerm) {
      // For an empty search, we can just return an empty successful response.
      return new Response(null, { status: 204 });
    }

    const timeoutSignal = AbortSignal.timeout(10_000);
    const combinedSignal = AbortSignal.any([searchController.signal, timeoutSignal]);

    // We must find the workspace before starting the stream.
    const workspace = await SWWStore.tryWorkspace(workspaceId);
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`);
    }
    await workspace.init();

    const encoder = new TextEncoder();
    const scannable = workspace.NewScannable();

    // 2. Create a ReadableStream to wrap the async generator.
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const searchGenerator = wrapGeneratorWithSignal(scannable.search(searchTerm), combinedSignal);

          for await (const result of searchGenerator) {
            // 3. For each result, stringify it and enqueue it as a chunk.
            // We add a newline to create a Newline Delimited JSON (NDJSON) stream.
            const chunk = encoder.encode(JSON.stringify(result) + "\n");
            controller.enqueue(chunk);
          }
          // When the generator is done, close the stream.
          controller.close();
        } catch (e) {
          // If the generator errors (e.g., from an abort), error the stream.
          controller.error(e);
        } finally {
          // 4. The search is complete (or failed), so we can clean up.
          activeSearches.delete(workspaceId);
        }
      },
      cancel(reason) {
        // This is called if the client aborts the fetch request.
        console.log("Stream canceled by client:", reason);
        searchController.abort("The client closed the connection.");
      },
    });

    // 5. Return the stream immediately.
    return new Response(stream, {
      status: 200,
      headers: {
        // Use the standard MIME type for NDJSON.
        "Content-Type": "application/x-ndjson",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // This outer catch now handles errors that occur *before* the stream starts.
    activeSearches.delete(workspaceId); // Clean up on pre-stream failure.

    if (e instanceof DOMException && e.name === "AbortError") {
      console.log(`Search aborted for workspace: ${workspaceId}`);
      return new Response(null, { status: 204 });
    }
    if (isError(e, NotFoundError)) {
      return new Response("Workspace not found", { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Internal Server Error", { status: 500 });
  }
  // The `finally` block is no longer needed here, as cleanup is handled
  // inside the stream's lifecycle for the success path.
}

// The response type is no longer a single object, but you might keep this
// type to represent a single item in the stream.
export type WorkspaceSearchResponseItem = DiskSearchResultData;
