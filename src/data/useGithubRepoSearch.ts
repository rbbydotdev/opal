import { IGitProviderAgent, Repo } from "@/data/RemoteAuthAgent";
import fuzzysort from "fuzzysort";
import { useEffect, useRef, useState } from "react";

const EMPTY_SEARCH_RESULT: Fuzzysort.KeyResults<Repo> = Object.assign([], {
  total: 0,
});
export const isFuzzyResult = (result: unknown): result is Fuzzysort.KeyResult<Repo> => {
  return (result as Fuzzysort.KeyResult<Repo>).highlight !== undefined;
};

export function useRepoSearch(agent: IGitProviderAgent | null, searchTerm: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Fuzzysort.KeyResults<Repo> | Repo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cache = useRef<{
    allRepos: Repo[];
    etag: string | null;
    lastCheck: number;
  }>({ allRepos: [], etag: null, lastCheck: 0 });

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!agent) {
      setResults(EMPTY_SEARCH_RESULT);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let isStale = cache.current.allRepos.length === 0;

        if (!isStale && Date.now() - cache.current.lastCheck > 2000) {
          const { updated, newEtag } = await agent.hasUpdates(cache.current.etag, { signal: controller.signal });
          isStale = updated;
          cache.current.etag = newEtag;
          cache.current.lastCheck = Date.now();
        }

        if (isStale) {
          cache.current.allRepos = await agent.getRepos({ signal: controller.signal });
        }

        if (requestIdRef.current === currentRequestId) {
          const searchResults = !searchTerm
            ? cache.current.allRepos
            : fuzzysort.go(searchTerm, cache.current.allRepos, { key: "full_name" });
          // searchResults.map(r=>r.
          setResults(searchResults);
          setIsLoading(false);
          setError(null);
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          const message = e?.message || "Unknown error";
          if (requestIdRef.current === currentRequestId) {
            setError(message);
            setResults(EMPTY_SEARCH_RESULT);
          }
          console.error("Failed to search repos:", e);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    };

    void performSearch();

    return () => {
      fuzzysort.cleanup();
      controller.abort();
    };
  }, [searchTerm, agent]);

  return { results, isLoading, error, clearError: () => setError(null) };
}
