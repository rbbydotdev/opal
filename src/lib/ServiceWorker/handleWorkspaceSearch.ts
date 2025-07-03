import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { wrapGeneratorWithSignal } from "@/lib/ServiceWorker/wrapGeneratorWithSignal";
import { SWWStore } from "./SWWStore";

const activeSearches = new Map<string, AbortController>();

/**
 * Creates a ReadableStream that merges search results from multiple workspaces.
 * @param workspaces - An array of initialized workspaces to search within.
 * @param searchTerm - The term to search for.
 * @param signal - The AbortSignal to cancel the search generators.
 * @param searchController - The main AbortController for the operation.
 * @param searchKey - The key for the activeSearches map for cleanup.
 * @param includeWorkspaceNameInResult - If true, adds a `workspace` property to each result.
 * @returns A ReadableStream of NDJSON search results.
 */
function createWorkspaceSearchStream({
  workspaces,
  searchTerm,
  signal,
  searchController,
  searchKey,
}: {
  workspaces: Workspace[];
  searchTerm: string;
  signal: AbortSignal;
  searchController: AbortController;
  searchKey: string;
}): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const searchPromises = workspaces.map(async (workspace) => {
          const scannable = workspace.NewScannable();
          const searchGenerator = wrapGeneratorWithSignal(scannable.search(searchTerm), signal);

          for await (const result of searchGenerator) {
            const chunk = encoder.encode(JSON.stringify(result) + "\n");
            controller.enqueue(chunk);
          }
        });

        // Wait for all concurrent searches to complete.
        await Promise.all(searchPromises);
        controller.close();
      } catch (e) {
        // If any generator errors (e.g., from an abort), error the stream.
        controller.error(e);
      } finally {
        // The search is complete (or failed), so we can clean up.
        activeSearches.delete(searchKey);
      }
    },
    cancel(reason) {
      console.log("Stream canceled by client:", reason);
      searchController.abort("The client closed the connection.");
    },
  });
}

export async function handleWorkspaceSearch(
  all: boolean,
  workspaceName: string | undefined | null,
  searchTerm: string
): Promise<Response> {
  // 1. Cancel previous searches.
  const searchController = new AbortController();
  const searchKey = all ? "( ͡° ͜ʖ ͡°) ALL!" : workspaceName!;

  if (activeSearches.has(searchKey)) {
    activeSearches.get(searchKey)?.abort("A new search was started.");
  }
  if (all) {
    activeSearches.forEach((cntrl) => cntrl.abort("A new global search was started."));
    activeSearches.clear();
  }
  activeSearches.set(searchKey, searchController);

  try {
    if (!searchTerm) {
      return new Response(null, { status: 204 });
    }

    const timeoutSignal = AbortSignal.timeout(10_000);
    const combinedSignal = AbortSignal.any([searchController.signal, timeoutSignal]);

    // 2. Prepare the list of workspaces to search.
    let workspacesToSearch: Workspace[];
    if (all) {
      const allWorkspaceMetas = await WorkspaceDAO.all();
      workspacesToSearch = await Promise.all(
        allWorkspaceMetas.map((ws) => SWWStore.tryWorkspace(ws.name).then((w) => w.init()))
      );
    } else {
      if (!workspaceName) {
        throw new NotFoundError(`Workspace name must be provided when all=false`);
      }
      const workspace = await SWWStore.tryWorkspace(workspaceName);
      await workspace.init();
      workspacesToSearch = [workspace]; // Wrap the single workspace in an array.
    }

    // 3. Create the stream using the helper function.
    const stream = createWorkspaceSearchStream({
      workspaces: workspacesToSearch,
      searchTerm,
      signal: combinedSignal,
      searchController,
      searchKey,
    });

    // 4. Return the stream in the response.
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // This outer catch handles errors that occur *before* the stream starts.
    activeSearches.delete(searchKey); // Clean up on pre-stream failure.

    if (e instanceof DOMException && e.name === "AbortError") {
      console.log(`Search aborted for: ${searchKey}`);
      return new Response(null, { status: 204 });
    }
    if (isError(e, NotFoundError)) {
      return new Response(e.message, { status: 404 });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Internal Server Error", { status: 500 });
  }
}
