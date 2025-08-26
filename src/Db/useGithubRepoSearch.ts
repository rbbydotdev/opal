import { IGitProviderAgent, Repo } from "@/Db/RemoteAuthAgent";
import fuzzysort from "fuzzysort";
import { useEffect, useRef, useState } from "react";

const EMPTY_SEARCH_RESULT: Fuzzysort.KeyResults<Repo> = Object.assign([], {
  total: 0,
});

export function useRepoSearch(agent: IGitProviderAgent | null, searchTerm: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Fuzzysort.KeyResults<Repo>>(EMPTY_SEARCH_RESULT);

  const cache = useRef<{
    allRepos: Repo[];
    etag: string | null;
    lastCheck: number;
  }>({ allRepos: [], etag: null, lastCheck: 0 });

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!searchTerm || !agent) {
      setResults(EMPTY_SEARCH_RESULT);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    const performSearch = async () => {
      setIsLoading(true);

      try {
        let isStale = cache.current.allRepos.length === 0;

        if (!isStale && Date.now() - cache.current.lastCheck > 2000) {
          const { updated, newEtag } = await agent.hasUpdates(cache.current.etag, { signal: controller.signal });
          isStale = updated;
          cache.current.etag = newEtag;
          cache.current.lastCheck = Date.now();
        }

        if (isStale) {
          cache.current.allRepos = await agent.getRepos({
            signal: controller.signal,
          });
        }

        if (requestIdRef.current === currentRequestId) {
          const searchResults = fuzzysort.go(searchTerm, cache.current.allRepos, { key: "full_name" });
          setResults(searchResults);
          setIsLoading(false);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Failed to search repos:", error);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    };

    void performSearch();

    return () => controller.abort();
  }, [searchTerm, agent]);

  return { results, isLoading };
}

// export function useGithubRepoSearch(agent: IRemoteAuthGithubAgent | null, searchTerm: string) {
//   const [isLoading, setIsLoading] = useState(true);
//   const [results, setResults] = useState<Fuzzysort.KeyResults<Repo>>(EMPTY_SEARCH_RESULT);

//   const cache = useRef<{
//     allRepos: Repo[];
//     etag: string | null;
//     lastCheck: number;
//   }>({ allRepos: [], etag: null, lastCheck: 0 });

//   const octokit = useMemo(() => agent?.octokit, [agent]);

//   // Track the latest request
//   const requestIdRef = useRef(0);

//   useEffect(() => {
//     if (!searchTerm || !octokit) {
//       setResults(EMPTY_SEARCH_RESULT);
//       setIsLoading(false);
//       return;
//     }

//     const controller = new AbortController();
//     const currentRequestId = ++requestIdRef.current; // bump request ID

//     const performSearch = async () => {
//       setIsLoading(true);

//       try {
//         let isStale = cache.current.allRepos.length === 0;
//         if (!isStale && Date.now() - cache.current.lastCheck > 2000) {
//           try {
//             await octokit.request("GET /user/repos", {
//               per_page: 1,
//               headers: { "If-None-Match": cache.current.etag ?? undefined },
//               request: { signal: controller.signal },
//             });
//           } catch (error: any) {
//             if (error.status === 304) {
//               isStale = false;
//             } else {
//               isStale = true;
//             }
//           } finally {
//             cache.current.lastCheck = Date.now();
//           }
//         }

//         if (isStale) {
//           const allNewRepos: Repo[] = [];
//           let page = 1;
//           let hasMore = true;
//           let newEtag: string | null = null;

//           while (hasMore) {
//             const response = await octokit.request("GET /user/repos", {
//               page,
//               per_page: 100,
//               affiliation: "owner,collaborator",
//               direction: "desc",
//               request: { signal: controller.signal },
//             });

//             if (page === 1) newEtag = response.headers.etag || null;
//             if (response.data.length < 100) hasMore = false;

//             allNewRepos.push(...(response.data as Repo[]));
//             page++;
//           }
//           cache.current.allRepos = allNewRepos;
//           cache.current.etag = newEtag;
//         }

//         // Only update state if this is still the latest request
//         if (requestIdRef.current === currentRequestId) {
//           const searchResults = fuzzysort.go(searchTerm, cache.current.allRepos, { key: "full_name" });
//           setResults(searchResults);
//           setIsLoading(false);
//         }
//       } catch (error: any) {
//         if (error.name !== "AbortError") {
//           console.error("Failed to search GitHub repos:", error);
//         }
//       } finally {
//         // Only clear loading if this request is still the latest
//         if (requestIdRef.current === currentRequestId) {
//           setIsLoading(false);
//         }
//       }
//     };

//     void performSearch();

//     return () => controller.abort();
//   }, [searchTerm, octokit]);

//   return { results, isLoading };
// }
