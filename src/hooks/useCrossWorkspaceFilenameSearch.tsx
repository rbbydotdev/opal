import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { useWorkspaceFilenameSearchResults } from "@/features/workspace-search/useWorkspaceFilenameSearchResults";
import { useCallback } from "react";

export function useCrossWorkspaceFilenameSearch() {
  const filenameSearch = useWorkspaceFilenameSearchResults(150);

  const searchFilenames = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) return;

      // Use the ALL_WS_KEY to search across all workspaces
      filenameSearch.submit({
        workspaceName: ALL_WS_KEY,
        searchTerm,
      });
    },
    [filenameSearch]
  );

  const resetSearch = useCallback(() => {
    filenameSearch.resetSearch();
  }, [filenameSearch]);

  return {
    searchFilenames,
    resetSearch,
    loading: filenameSearch.isSearching,
    hasResults: filenameSearch.hasResults,
    error: filenameSearch.error,
    workspaceResults: filenameSearch.workspaceResults,
  };
}