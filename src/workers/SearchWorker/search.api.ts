import { type Workspace } from "@/data/Workspace";
import { basename } from "@/lib/paths2";

import "@/workers/transferHandlers/asyncGenerator.th";

export type SearchMode = "content" | "filename";

export const SearchWorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchTerm: string, mode: SearchMode = "content") {
    if (mode === "filename") {
      yield* SearchWorkerApi.searchFilenames(workspace, searchTerm);
    } else {
      yield* workspace.NewScannable().search(searchTerm);
    }
  },
  async *searchWorkspaces(
    workspaces: AsyncGenerator<Workspace> | Workspace[],
    searchTerm: string,
    mode: SearchMode = "content"
  ) {
    for await (const workspace of workspaces) {
      if (mode === "filename") {
        yield* SearchWorkerApi.searchFilenames(workspace, searchTerm);
      } else {
        yield* workspace.NewScannable().search(searchTerm);
      }
    }
  },
  async *searchFilenames(workspace: Workspace, searchTerm: string) {
    // Get all files from the workspace
    const files = workspace.getFlatTree({
      filterIn: (node) => node.type === "file",
      filterOut: () => false,
    });

    // Search file names
    const matchedFiles = files.filter((filePath) => {
      const filename = basename(filePath);
      return filename.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Yield results in the same format as content search
    if (matchedFiles.length > 0) {
      yield {
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
    }
  },
};

export type SearchWorkerApiType = typeof SearchWorkerApi;
