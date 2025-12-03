import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { errF, isError, NotFoundError } from "@/lib/errors";
import { basename } from "@/lib/paths2";
import { wrapGeneratorWithSignal } from "@/lib/service-worker/wrapGeneratorWithSignal";
import { Workspace } from "@/workspace/Workspace";
import { WorkspaceQueryParams } from "../../data/dao/useWorkspaceSearchResults";
import { SWWStore } from "./SWWStore";

const activeSearches = new Map<string, AbortController>();

function createWorkspaceSearchStream({
  workspaces,
  searchTerm,
  regexp,
  mode,
  signal,
  searchController,
  searchKey,
}: {
  workspaces: Workspace[];
  searchTerm: string;
  regexp?: boolean;
  mode?: "content" | "filename";
  signal: AbortSignal;
  searchController: AbortController;
  searchKey: string;
}): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const searchPromises = workspaces.map(async (workspace) => {
          try {
            if (mode === "filename") {
              // Filename search
              const files = workspace.getFlatTree({
                filterIn: (node) => node.type === "file",
                filterOut: () => false,
              });

              const matchedFiles = files.filter((filePath) => {
                const filename = basename(filePath);
                return filename.toLowerCase().includes(searchTerm.toLowerCase());
              });

              if (matchedFiles.length > 0) {
                // Create a result in the same format as content search
                const result = {
                  matches: matchedFiles.map((filePath) => ({
                    // chsum: filePath, // Use file path as checksum for filename search
                    chsum: 0,
                    lineNumber: 1,
                    lineStart: 0,
                    lineEnd: basename(filePath).length,
                    start: 0,
                    end: basename(filePath).length,
                    lineText: basename(filePath),
                    relStart: 0,
                    relEnd: basename(filePath).length,
                    linesSpanned: 0,
                  })),
                  meta: {
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    filePath: matchedFiles[0]!, // Use first matched file as source
                  },
                };
                const chunk = encoder.encode(JSON.stringify(result) + "\n");
                controller.enqueue(chunk);
              }
            } else {
              // Content search (existing logic)
              const scannable = workspace.NewScannable();
              const searchOptions = { regex: regexp !== undefined ? regexp : true };
              const searchGenerator = wrapGeneratorWithSignal(scannable.search(searchTerm, searchOptions), signal);

              for await (const result of searchGenerator) {
                const chunk = encoder.encode(JSON.stringify(result) + "\n");
                controller.enqueue(chunk);
              }
            }
          } catch (searchError) {
            console.error(`Search error in workspace ${workspace.name}:`, searchError);
            throw searchError;
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

export async function handleWorkspaceSearch({
  workspaceName,
  searchTerm,
  regexp = true,
  mode = "content",
}: WorkspaceQueryParams): Promise<Response> {
  // 1. Cancel previous searches.
  const searchController = new AbortController();
  const searchKey = workspaceName; //all ? ALL_WS_KEY : workspaceName!;
  const all = workspaceName === ALL_WS_KEY;

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

    const timeoutSignal = AbortSignal.timeout(5_000);
    const combinedSignal = AbortSignal.any([searchController.signal, timeoutSignal]);

    // 2. Prepare the list of workspaces to search.
    let workspacesToSearch: Workspace[];
    if (all) {
      const allWorkspaceMetas = await WorkspaceDAO.all();
      workspacesToSearch = await Promise.all(
        allWorkspaceMetas.map((ws) => SWWStore.tryWorkspace(ws.name).then((w) => w.initNoListen()))
      );
    } else {
      const workspace = await SWWStore.tryWorkspace(workspaceName).then((w) => w.initNoListen());
      workspacesToSearch = [workspace]; // Wrap the single workspace in an array.
    }

    // 3. Create the stream using the helper function.
    const stream = createWorkspaceSearchStream({
      workspaces: workspacesToSearch,
      searchTerm,
      regexp,
      mode,
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
      return new Response(null, { status: 204, statusText: "search aborted" });
    }
    if (isError(e, NotFoundError)) {
      return new Response(e.message, { status: 404, statusText: "not found " + e.message });
    }
    console.error(errF`Error in service worker: ${e}`.toString());
    return new Response("Internal Server Error", { status: 500, statusText: "application error" });
  }
}
