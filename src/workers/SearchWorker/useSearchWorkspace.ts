import { Workspace } from "@/Db/Workspace";
import { SearchWorkspaceWorker } from "@/workers/SearchWorker/SearchWorkspace";
import { useCallback, useEffect, useMemo } from "react";

export function useSearchWorkspace(workspace: Workspace) {
  const searchWorker = useMemo(() => new SearchWorkspaceWorker(), []);
  const search = useCallback(
    async (term: string) => {
      const scanner = searchWorker.searchWorkspace(workspace, term);
      for await (const result of scanner) {
        console.log(result);
      }
    },
    [searchWorker, workspace]
  );
  useEffect(() => searchWorker.teardown.bind(searchWorker), [searchWorker]);
  return {
    search,
  };
}
