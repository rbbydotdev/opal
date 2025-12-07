import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { FilterOutSpecialDirs } from "@/data/SpecialDirs";
import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { errF, isError, NotFoundError } from "@/lib/errors/errors";
import { AbsPath, basename } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import fuzzysort from "fuzzysort";
import { SWWStore } from "./SWWStore";

const activeFilenameSearches = new Map<string, AbortController>();

export interface WorkspaceFilenameSearchParams {
  workspaceName: string;
  searchTerm: string;
}

export interface FilenameSearchResult {
  filePath: AbsPath;
  filename: string;
  workspaceName: string;
  workspaceId: string;
}

function createWorkspaceFilenameSearchStream({
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
          try {
            // Get all files from the workspace
            const files = workspace.getFlatTree({
              filterIn: (node) => node.type === "file",
              filterOut: () => false,
            });

            // Filter out special directories first
            const visibleFiles = files.filter((filePath) => FilterOutSpecialDirs(filePath));

            // Use fuzzy search on filenames
            const searchTargets = visibleFiles.map((filePath) => basename(filePath));
            const searchResults = fuzzysort.go(searchTerm, searchTargets, { limit: 50 });

            // Map fuzzy search results back to file paths
            const matchedFiles = searchResults.map((result) => {
              const filename = result.target;
              return visibleFiles.find((filePath) => basename(filePath) === filename)!;
            });

            // Send each matched file as a separate result
            for (const filePath of matchedFiles) {
              if (signal.aborted) break;

              const result: FilenameSearchResult = {
                filePath,
                filename: basename(filePath),
                workspaceName: workspace.name,
                workspaceId: workspace.id,
              };

              const chunk = encoder.encode(JSON.stringify(result) + "\n");
              controller.enqueue(chunk);
            }
          } catch (searchError) {
            logger.error(`Filename search error in workspace ${workspace.name}:`, searchError);
            throw searchError;
          }
        });

        // Wait for all concurrent searches to complete
        await Promise.all(searchPromises);
        controller.close();
      } catch (e) {
        // If any generator errors (e.g., from an abort), error the stream
        controller.error(e);
      } finally {
        // The search is complete (or failed), so we can clean up
        activeFilenameSearches.delete(searchKey);
      }
    },
    cancel(reason) {
      logger.log("Filename search stream canceled by client:", reason);
      searchController.abort();
    },
  });
}

export async function handleWorkspaceFilenameSearch({
  workspaceName,
  searchTerm,
}: WorkspaceFilenameSearchParams): Promise<Response> {
  // 1. Cancel previous searches
  const searchController = new AbortController();
  const searchKey = workspaceName;
  const all = workspaceName === ALL_WS_KEY;

  if (activeFilenameSearches.has(searchKey)) {
    activeFilenameSearches.get(searchKey)?.abort();
  }
  if (all) {
    activeFilenameSearches.forEach((ctrl) => ctrl.abort());
    activeFilenameSearches.clear();
  }
  activeFilenameSearches.set(searchKey, searchController);

  try {
    if (!searchTerm) {
      return new Response(null, { status: 204 });
    }

    const timeoutSignal = AbortSignal.timeout(5_000);
    const combinedSignal = AbortSignal.any([searchController.signal, timeoutSignal]);

    // 2. Prepare the list of workspaces to search
    let workspacesToSearch: Workspace[];
    if (all) {
      const allWorkspaceMetas = await WorkspaceDAO.all();
      workspacesToSearch = await Promise.all(
        allWorkspaceMetas.map((ws) => SWWStore.tryWorkspace(ws.name).then((w) => w.initNoListen()))
      );
    } else {
      const workspace = await SWWStore.tryWorkspace(workspaceName).then((w) => w.initNoListen());
      workspacesToSearch = [workspace];
    }

    // 3. Create the filename search stream
    const stream = createWorkspaceFilenameSearchStream({
      workspaces: workspacesToSearch,
      searchTerm,
      signal: combinedSignal,
      searchController,
      searchKey,
    });

    // 4. Return the stream in the response
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // This outer catch handles errors that occur *before* the stream starts
    activeFilenameSearches.delete(searchKey);

    if (e instanceof DOMException && e.name === "AbortError") {
      logger.log(`Filename search aborted for: ${searchKey}`);
      return new Response(null, { status: 204, statusText: "filename search aborted" });
    }
    if (isError(e, NotFoundError)) {
      return new Response(e.message, { status: 404, statusText: "not found " + e.message });
    }
    logger.error(errF`Error in filename search service worker: ${e}`.toString());
    return new Response("Internal Server Error", { status: 500, statusText: "application error" });
  }
}
