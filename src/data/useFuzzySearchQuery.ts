import { RemoteAuthAgentSearchType } from "@/data/RemoteSearchFuzzyCache";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import fuzzysort from "fuzzysort";

export function useFuzzySearchQuery<TResult extends Record<string, any>>(
  agent: RemoteAuthAgentSearchType<TResult> | null,
  searchKey: Extract<keyof TResult, string>,
  searchTerm: string,
  cacheKey: string | string[]
) {
  const queryClient = useQueryClient();

  const queryKey = Array.isArray(cacheKey) ? ["remote-search", ...cacheKey] : ["remote-search", cacheKey];

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey,

    queryFn: async () => {
      if (!agent) throw new Error("No agent provided");
      const data = await agent.fetchAll();
      return data;
    },
    staleTime: 5000, // cache lifetime = 5 seconds
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: (allItems) => {
      if (!searchTerm) return allItems;
      return fuzzysort.go(searchTerm, allItems, { key: searchKey }) as unknown as TResult[];
    },
  });

  // optional helpers to resemble your previous hook’s API
  const clearCache = () => queryClient.removeQueries({ queryKey });
  const reset = () => queryClient.resetQueries({ queryKey });
  const clearError = () => queryClient.setQueryData(queryKey, null);

  return {
    loading: isLoading,
    fetching: isFetching,
    error,
    data,
    clearCache,
    refetch,
    reset,
    clearError,
    results: data,
  };
}
