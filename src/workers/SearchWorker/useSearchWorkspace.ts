import { Workspace } from "@/Db/Workspace";
import { SearchWorkspaceWorker } from "@/workers/SearchWorker/SearchWorkspace";
import { useCallback, useEffect, useMemo } from "react";

export function useSearchWorkspace(workspace: Workspace) {
  const searchWorker = useMemo(() => new SearchWorkspaceWorker(), []);
  const search = useCallback(
    async function* scan(term: string) {
      const scanner = searchWorker.searchWorkspace(workspace, term);
      for await (const result of scanner) {
        yield result;
      }
    },
    [searchWorker, workspace]
  );
  useEffect(() => searchWorker.teardown.bind(searchWorker), [searchWorker]);
  return {
    search,
  };
}
