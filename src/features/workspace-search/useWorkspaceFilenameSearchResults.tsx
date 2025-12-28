import { AbsPath, absPath, joinPath } from "@/lib/paths2";
import { FilenameSearchResult } from "@/lib/service-worker/handleWorkspaceFilenameSearch";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 250;

type WorkspaceFilenameQueryParams = {
  workspaceName: string;
  searchTerm: string;
};

type WorkspaceFilenameFetchParams = WorkspaceFilenameQueryParams & {
  signal: AbortSignal;
};

async function* fetchFilenameSearch({
  workspaceName,
  searchTerm,
  signal,
}: WorkspaceFilenameFetchParams): AsyncGenerator<FilenameSearchResult, void, unknown> {
  const url = new URL(joinPath(absPath("workspace-filename-search"), workspaceName ?? ""), window.location.origin);

  url.searchParams.set("searchTerm", searchTerm);
  console.debug(`filename search url = ${url.toString()}`);

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
  if (!res.ok) throw new Error(`Filename search failed: ${res.statusText}`);
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
        const result = JSON.parse(line) as FilenameSearchResult;
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
 * A custom hook to perform a debounced, streaming filename search within workspaces.
 * It handles loading states, errors, and aborting previous requests.
 */
export function useWorkspaceFilenameSearchResults(debounceMs = SEARCH_DEBOUNCE_MS) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [ctx, setCtx] = useState<{
    queryResults: FilenameSearchResult[];
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
    async ({ workspaceName, searchTerm }: WorkspaceFilenameQueryParams) => {
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
        const searchGenerator = fetchFilenameSearch({
          workspaceName,
          searchTerm,
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
        console.error("Filename search error:", err);
        setCtx(() => ({
          error: "Filename search failed. Please try again.",
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
    ({ searchTerm, workspaceName }: WorkspaceFilenameQueryParams) => {
      setCtx((prev) => ({ ...prev, isSearching: true }));
      if (debounceMs === 0) {
        void query({ searchTerm, workspaceName });
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          void query({ searchTerm, workspaceName });
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

  const filteredResults = ctx.queryResults.filter(
    ({ workspaceName, filePath }) => !hidden.includes(resultKey(workspaceName, filePath))
  );

  const workspaceResults = Object.entries(
    Object.groupBy(filteredResults, (result: FilenameSearchResult) => result.workspaceName) as Record<
      string,
      FilenameSearchResult[]
    >
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
