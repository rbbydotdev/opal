import { Workspace } from "@/Db/Workspace";
import { SearchResultData } from "@/features/search/SearchResults";
import { SearchWorkspaceWorker } from "@/workers/SearchWorker/SearchWorkspace";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

export type DiskSearchResultData = {
  meta: {
    path: string;
  };
  matches: SearchResultData[];
};
export function useSearchWorkspace(workspace: Workspace) {
  const searchWorker = useMemo(() => new SearchWorkspaceWorker(), []);
  const [_isPending, startTransition] = useTransition();

  const search = useCallback(
    async function* scan(term: string, abortSignal?: AbortSignal) {
      for await (const result of searchWorker.searchWorkspace(workspace, term, abortSignal)) {
        if (abortSignal?.aborted) {
          console.log("Search aborted in generator");
          return;
        }
        yield result;
      }
    },
    [searchWorker, workspace]
  );
  useEffect(() => searchWorker.teardown.bind(searchWorker), [searchWorker]);

  const [appendedResults, setAppendResults] = useState<DiskSearchResultData[]>([]);
  const submit = useCallback(
    async (searchTerm: string, abortSignal?: AbortSignal) => {
      console.log("Submitting search term:", searchTerm);
      startTransition(async () => {
        setAppendResults([]);
        for await (const res of search(searchTerm, abortSignal)) {
          if (abortSignal?.aborted) {
            console.log("Search aborted in submit");
            return;
          }
          startTransition(async () => {
            setAppendResults((prev) => [...prev, res]);
          });
        }
      });
    },
    [search]
  );
  const reset = useCallback(() => {
    setAppendResults([]);
  }, []);
  return {
    submit,
    results: appendedResults,
    reset,
    search,
  };
}
