import { Workspace } from "@/Db/Workspace";
import { WorkspaceSearchItem } from "@/Db/WorkspaceScannable";
// import { DiskSearchResultData } from "@/features/search/SearchResults";
import { SearchWorkspaceWorker } from "@/workers/SearchWorker/SearchWorkspace";
import { Semaphore } from "async-mutex";
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSearchWorkspace(workspace: Workspace) {
  const searchWorker = useMemo(() => {
    return new SearchWorkspaceWorker();
  }, []);

  const search = useCallback(
    async function* scan(term: string) {
      for await (const file of searchWorker.searchWorkspace(workspace, term)) {
        yield file;
      }
    },
    [searchWorker, workspace]
  );
  useEffect(() => {
    return () => {
      searchWorker.teardown();
    };
  }, [searchWorker]);

  const [appendedResults, setAppendResults] = useState<WorkspaceSearchItem[]>([]);
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

// The context now provides functions to interact with the worker pool.
export const SearchWorkerContext = createContext<{
  maxPoolSize: number;
  setMaxPoolSize: (size: number) => void;
  acquireWorker: () => Promise<Worker>;
  releaseWorker: (worker: Worker) => void;
  terminateAll: () => void;
} | null>(null);

export function SearchWorkerProvider({ children }: { children: React.ReactNode }) {
  // Default pool size to the number of logical processors or 2 as a fallback.
  const defaultPoolSize = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;

  const [maxPoolSize, setMaxPoolSize] = useState(defaultPoolSize);

  // Refs to hold the state of the worker pool without causing re-renders.
  const pool = useRef<Worker[]>([]);
  const availableWorkers = useRef<Worker[]>([]);
  const semaphore = useRef(new Semaphore(maxPoolSize));

  // Adjust the semaphore's limit when maxPoolSize changes.
  useEffect(() => {
    semaphore.current = new Semaphore(maxPoolSize);
  }, [maxPoolSize]);

  const createWorker = useCallback(() => {
    const worker = new Worker(new URL("/src/workers/SearchWorker/search.ww.ts", import.meta.url), { type: "module" });
    pool.current.push(worker);
    return worker;
  }, []);

  const acquireWorker = useCallback(async (): Promise<Worker> => {
    // This will wait until a "permit" is available from the semaphore.
    // The number of permits is equal to maxPoolSize.
    await semaphore.current.acquire();

    // Once we have a permit, we can take a worker.
    // Prioritize re-using an available worker.
    if (availableWorkers.current.length > 0) {
      return availableWorkers.current.pop()!;
    }

    // If no workers are available, it means we have a permit to create a new one.
    return createWorker();
  }, [createWorker]);

  const releaseWorker = useCallback((worker: Worker) => {
    // Add the worker back to the available queue.
    availableWorkers.current.push(worker);
    // Release the permit, allowing another consumer to acquire a worker.
    semaphore.current.release();
  }, []);

  const terminateAll = useCallback(() => {
    console.log(`Terminating ${pool.current.length} workers...`);
    pool.current.forEach((worker) => worker.terminate());
    pool.current = [];
    availableWorkers.current = [];
    // Reset the semaphore
    semaphore.current = new Semaphore(maxPoolSize);
  }, [maxPoolSize]);

  // Terminate all workers when the provider unmounts.
  useEffect(() => {
    return () => {
      terminateAll();
    };
  }, [terminateAll]);

  const value = useMemo(
    () => ({
      maxPoolSize,
      setMaxPoolSize,
      acquireWorker,
      releaseWorker,
      terminateAll,
    }),
    [maxPoolSize, acquireWorker, releaseWorker, terminateAll]
  );

  return <SearchWorkerContext.Provider value={value}>{children}</SearchWorkerContext.Provider>;
}

// Custom hook for easy consumption of the context
export function useSearchWorkers() {
  const context = React.useContext(SearchWorkerContext);
  if (!context) {
    throw new Error("useSearchWorkers must be used within a SearchWorkerProvider");
  }
  return context;
}
