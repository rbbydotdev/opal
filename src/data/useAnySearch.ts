import { IRemoteAuthAgentSearch, RemoteSearchFuzzyCache } from "@/data/RemoteSearchFuzzyCache";
import { useEffect, useMemo, useSyncExternalStore } from "react";

export function useAnySearch<T extends Record<string, any>>({
  agent,
  searchTerm,
  searchKey,
}: {
  agent: IRemoteAuthAgentSearch<T> | null;
  searchTerm: string;
  searchKey: Extract<keyof T, string>;
}) {
  // Create and manage the search instance
  const searchInstance = useMemo(() => {
    return new RemoteSearchFuzzyCache(agent, searchKey);
  }, [agent, searchKey]);

  // Update agent and search term when they change, then trigger search
  useEffect(() => {
    searchInstance.setSearchTerm(searchTerm).search();
  }, [searchTerm, searchInstance]);

  // Subscribe using class methods directly
  const loading = useSyncExternalStore(searchInstance.onLoading, searchInstance.getLoading);
  const results = useSyncExternalStore(searchInstance.onResults, searchInstance.getResults);
  const error = useSyncExternalStore(searchInstance.onError, searchInstance.getError);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      searchInstance.dispose();
    };
  }, [searchInstance]);

  return {
    results,
    loading,
    error,
    clearError: () => searchInstance.clearError(),
    search: () => searchInstance.search(),
  };
}
