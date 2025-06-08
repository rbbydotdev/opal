import { Workspace } from "@/Db/Workspace";
import { SearchWorkspaceWorker } from "@/workers/SearchWorker/SearchWorkspace";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchResultData } from "../../Db/SearchScan";

export type DiskSearchResultData = {
  meta: {
    path: string;
  };
  matches: SearchResultData[];
};
export function useSearchWorkspace(workspace: Workspace) {
  const searchWorker = useMemo(() => new SearchWorkspaceWorker(), []);
  const search = useCallback(
    async function* scan(term: string) {
      for await (const result of searchWorker.searchWorkspace(workspace, term)) {
        yield result;
      }
    },
    [searchWorker, workspace]
  );
  useEffect(() => searchWorker.teardown.bind(searchWorker), [searchWorker]);

  const [appendedResults, setAppendResults] = useState<DiskSearchResultData[]>([]);
  const submit = useCallback(
    async (searchTerm: string) => {
      setAppendResults([]);
      for await (const res of search(searchTerm)) {
        setAppendResults((prev) => [...prev, res]);
      }
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
