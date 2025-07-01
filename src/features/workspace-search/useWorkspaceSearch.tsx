"use client";
import { DiskSearchResultData } from "@/features/search/SearchResults";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Performs a streaming search and yields results as they arrive.
 * This function is not meant to be called directly by components.
 */
async function* fetchQuerySearch({
  workspaceName,
  searchTerm,
  signal,
}: {
  workspaceName: string;
  searchTerm: string;
  signal: AbortSignal;
}): AsyncGenerator<DiskSearchResultData, void, unknown> {
  const url = new URL(`/workspace-search/${workspaceName}`, window.location.origin);
  url.searchParams.set("searchTerm", searchTerm);

  const res = await fetch(url.toString(), { signal });

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
        const result = JSON.parse(line) as DiskSearchResultData;
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
export function useWorkspaceSearch({
  workspaceName,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: {
  workspaceName: string;
  debounceMs?: number;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [queryResults, setQueryResults] = useState<DiskSearchResultData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useCallback(
    async (searchTerm: string) => {
      if (!workspaceName || !searchTerm.trim()) {
        setIsSearching(false);
        setQueryResults(null);
        setError(null);
        return;
      }
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setQueryResults([]);
      setError(null);

      try {
        const searchGenerator = fetchQuerySearch({
          workspaceName,
          searchTerm,
          signal: controller.signal,
        });

        for await (const result of searchGenerator) {
          if (controller.signal.aborted) break;
          setQueryResults((prev) => [...(prev || []), result]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setError("Search failed. Please try again.");
        setQueryResults(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [workspaceName]
  );

  const submit = useCallback(
    (searchTerm: string) => {
      if (debounceMs === 0) {
        void query(searchTerm);
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          void query(searchTerm);
        }, debounceMs);
      }
    },
    [debounceMs, query]
  );

  // Cleanup on unmount
  const tearDown = useCallback(() => {
    abortControllerRef.current?.abort();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  useEffect(() => tearDown(), [tearDown]);
  return { isSearching, queryResults, error, tearDown, submit };
}
