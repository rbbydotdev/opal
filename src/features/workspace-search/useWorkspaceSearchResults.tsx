import { WorkspaceSearchItem } from "@/data/WorkspaceScannable";
import { absPath, AbsPath, joinPath } from "@/lib/paths2";
// import { DiskSearchResultData } from "@/features/search/SearchResults";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 250;

type WorkspaceQueryParams = {
  workspaceName: string;
  searchTerm: string;
  regexp?: boolean;
  mode?: "content" | "filename";
};
type WorkspaceFetchParams = WorkspaceQueryParams & {
  signal: AbortSignal;
};
async function* fetchQuerySearch({
  workspaceName,
  searchTerm,
  regexp,
  mode,
  signal,
}: WorkspaceFetchParams): AsyncGenerator<WorkspaceSearchItem, void, unknown> {
  const url = new URL(joinPath(absPath("workspace-search"), workspaceName ?? ""), window.location.origin);

  url.searchParams.set("searchTerm", searchTerm);
  url.searchParams.set("workspaceName", workspaceName);
  const regexpValue = (regexp ?? true) ? "1" : "0";
  url.searchParams.set("regexp", regexpValue);
  if (mode) {
    url.searchParams.set("mode", mode);
  }
  console.debug(`query search url = ${url.toString()}, regexp param: ${regexp}, regexp value: ${regexpValue}`);

  let res = null;
  try {
    res = await fetch(url.toString(), {
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return; // Request was aborted, exit gracefully
    }
    throw err; // Re-throw other errors
  }
  if (res.status === 204) {
    return; // No content, successful but empty stream
  }
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  if (!res.body) throw new Error("Response has no body to read.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last, possibly incomplete line

      for (const line of lines) {
        if (line.trim() === "") continue;
        const result = JSON.parse(line) as WorkspaceSearchItem;
        yield result;
      }
    }
  } catch (err) {
    // Don't throw an error if the request was intentionally aborted
    if (err instanceof DOMException && err.name === "AbortError") {
      return;
    }
    throw err;
  }
}

/**
 * A custom hook to perform a debounced, streaming search within a workspace.
 * It handles loading states, errors, and aborting previous requests.
 *
 * @returns The search state including results, loading status, error, and a submit function.
 */
export function useWorkspaceSearchResults(debounceMs = SEARCH_DEBOUNCE_MS) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [ctx, setCtx] = useState<{
    queryResults: WorkspaceSearchItem[];
    error: string | null;
    isSearching: boolean;
  }>({ queryResults: [], error: null, isSearching: false });

  const resultKey = (workspaceName: string, filePath: AbsPath) => `${workspaceName}@${filePath}`;
  const hideResult = (workspaceName: string, filePath: AbsPath) =>
    setHidden((prev) => [...prev, resultKey(workspaceName, filePath)]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setCtx({ queryResults: [], error: null, isSearching: false });
  }, []);

  const query = useCallback(
    async ({ workspaceName, searchTerm, regexp, mode }: WorkspaceQueryParams) => {
      if (!workspaceName || !searchTerm) {
        reset();
        return;
      }
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setCtx({
        error: null,
        isSearching: true,
        queryResults: [],
      });

      try {
        const searchGenerator = fetchQuerySearch({
          workspaceName,
          searchTerm,
          regexp,
          mode,
          signal: controller.signal,
        });

        for await (const result of searchGenerator) {
          if (controller.signal.aborted) break;
          setCtx((prev) => ({
            error: null,
            isSearching: true,
            queryResults: [...prev.queryResults, result],
          }));
        }
      } catch (err) {
        console.error("Search error:", err);
        setCtx(() => ({
          error: "Search failed. Please try again.",
          isSearching: false,
          queryResults: [],
        }));
      } finally {
        setCtx((prev) => ({
          error: ctx.error,
          isSearching: false,
          queryResults: prev.queryResults,
        }));
      }
    },
    [reset, ctx.error]
  );

  const submit = useCallback(
    ({ searchTerm, workspaceName, regexp, mode }: WorkspaceQueryParams) => {
      setCtx((prev) => ({ ...prev, isSearching: true }));
      if (debounceMs === 0) {
        void query({ searchTerm, workspaceName, regexp, mode });
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          void query({ searchTerm, workspaceName, regexp, mode });
        }, debounceMs);
      }
    },
    [debounceMs, query]
  );

  // Cleanup on unmount
  const tearDown = useCallback(() => {
    reset();
    abortControllerRef.current?.abort();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [reset]);

  useEffect(() => tearDown(), [tearDown]);

  const filteredResults = useMemo(() => {
    return ctx.queryResults.filter(
      ({ meta: { workspaceName, filePath } }) => !hidden.includes(resultKey(workspaceName, filePath))
    );
  }, [hidden, ctx.queryResults]);

  const workspaceResults = useMemo(
    () =>
      Object.entries(
        Object.groupBy(
          filteredResults,
          (result: WorkspaceSearchItem) => result.meta.workspaceName
        ) as unknown as Record<string, typeof filteredResults>
      ),
    [filteredResults]
  );

  const hasResults = filteredResults.length > 0;

  return {
    isSearching: ctx.isSearching,
    workspaceResults,
    hasResults,
    error: ctx.error,
    tearDown,
    submit,
    resetSearch: reset,
    hideResult: hideResult,
  };
}
