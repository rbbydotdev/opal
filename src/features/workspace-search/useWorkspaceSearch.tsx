"use client";
import { DiskSearchResultData } from "@/features/search/SearchResults";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 250;
interface UseWorkspaceSearchProps {
  /** The search query string. */
  searchTerm: string;
  /** The name of the workspace to search within. */
  workspaceName: string | undefined;
}

async function QuerySearchEndpoint({
  workspaceName,
  searchTerm,
  signal,
  onData,
  onError,
  onComplete,
}: {
  workspaceName: string;
  searchTerm: string;
  signal: AbortSignal;
  onError?: (err: Error) => void;
  onData: (result: DiskSearchResultData) => void;
  onComplete?: (error?: Error | null) => void;
}) {
  //Fetcher
  const url = new URL(`/workspace-search/${workspaceName}`, window.location.origin);
  url.searchParams.set("searchTerm", searchTerm);

  try {
    const res = await fetch(url.toString(), { signal });

    if (res.status === 204) {
      // setIsSearching(false);
      return onComplete?.();
    }
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    if (!res.body) throw new Error("Response has no body to read.");

    // Consume the NDJSON stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        const result = JSON.parse(line) as DiskSearchResultData;
        onData(result);
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // This is an expected error when a search is cancelled.
      return;
    }
    // console.error("Search error:", err);
    err = err as Error;
    onError?.(err as Error);
    return onComplete?.(err as Error);
  }
  onComplete?.();
}

/**
 * A custom hook to perform a debounced, streaming search within a workspace.
 * It handles loading states, errors, and aborting previous requests.
 *
 * @returns The search state including results, loading status, and any errors.
 */

export function useWorkspaceSearch({ searchTerm, workspaceName }: UseWorkspaceSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [queryResults, setQueryResults] = useState<DiskSearchResultData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resets the internal state of the hook
  const reset = useCallback(() => {
    setIsSearching(false);
    setQueryResults(null);
    setError(null);
  }, []);

  // Cleanup function to abort in-flight requests and timers
  const tearDownSearch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!workspaceName || !searchTerm.trim()) {
      reset();
      tearDownSearch(); // Ensure any lingering requests are cancelled
      return;
    }

    // Set up for a new search
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // Debounce the search execution
    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setQueryResults([]); // Initialize with empty array for streaming
      setError(null);

      //Fetcher
      const url = new URL(`/workspace-search/${workspaceName}`, window.location.origin);
      url.searchParams.set("searchTerm", searchTerm);

      try {
        const res = await fetch(url.toString(), { signal });

        if (res.status === 204) {
          setIsSearching(false);
          return;
        }
        if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
        if (!res.body) throw new Error("Response has no body to read.");

        // Consume the NDJSON stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            const result = JSON.parse(line) as DiskSearchResultData;
            setQueryResults((prev) => [...(prev || []), result]);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // This is an expected error when a search is cancelled.
          return;
        }
        console.error("Search error:", err);
        setError("Search failed. Please try again.");
        setQueryResults(null);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    // Cleanup function for the effect
    return () => tearDownSearch();
  }, [searchTerm, workspaceName, reset, tearDownSearch]);

  return { isSearching, queryResults, error, tearDownSearch };
}
