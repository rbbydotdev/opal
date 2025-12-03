import { WorkspaceDAO } from "@/data/WorkspaceDAO";
import { useCrossWorkspaceFilenameSearch } from "@/hooks/useCrossWorkspaceFilenameSearch";
import { AbsPath } from "@/lib/paths2";
import { useCallback } from "react";

export interface FileWithWorkspace {
  path: AbsPath;
  workspaceName: string;
  workspaceHref: string;
}

function useAllWorkspaceFiles() {
  // Use the new cross-workspace search hook
  const crossWorkspaceSearch = useCrossWorkspaceFilenameSearch();

  const searchFilenames = useCallback(
    async (searchTerm: string): Promise<FileWithWorkspace[]> => {
      if (!searchTerm.trim()) return [];

      crossWorkspaceSearch.searchFilenames(searchTerm);

      // Convert the search results to FileWithWorkspace format
      const workspaceDAOs = await WorkspaceDAO.all();

      return crossWorkspaceSearch.workspaceResults.flatMap(([workspaceName, results]) => {
        const workspaceDAO = workspaceDAOs.find((dao) => dao.name === workspaceName);
        const workspaceHref = workspaceDAO?.href || `/workspace/${workspaceName}`;

        return results.map((result) => ({
          path: result.filePath,
          workspaceName: result.workspaceName,
          workspaceHref,
        }));
      });
    },
    [crossWorkspaceSearch]
  );

  // Return search functionality and loading state
  return {
    files: [], // We don't pre-load files anymore, only search on demand
    loading: crossWorkspaceSearch.loading,
    searchFilenames,
    hasResults: crossWorkspaceSearch.hasResults,
    error: crossWorkspaceSearch.error,
  };
}
