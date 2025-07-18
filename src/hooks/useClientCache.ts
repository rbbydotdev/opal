/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef } from "react";

type AsyncFn<T, A extends any[]> = (...args: A) => Promise<T>;

/**
 * A client-side hook that mimics React's `cache` behavior for use with `use()`.
 * It memoizes promises returned by an async function, ensuring that for the
 * same inputs, the same promise instance is returned, preventing infinite
 * suspense loops.
 *
 * The cache is tied to the component's lifecycle.
 *
 * @param asyncFn The async function to cache.
 * @returns A memoized version of the async function.
 */
export function useClientCache<T, A extends any[]>(asyncFn: AsyncFn<T, A>) {
  // Use a ref to store the cache. A ref persists across re-renders
  // without causing them.
  const cache = useRef(new Map<string, Promise<T>>());

  const cachedFn = useCallback(
    (...args: A): Promise<T> => {
      // A simple but effective way to create a cache key for primitive args.
      const key = JSON.stringify(args);

      if (cache.current.has(key)) {
        return cache.current.get(key)!;
      }

      // If not in cache, call the original async function.
      const promise = asyncFn(...args);

      // IMPORTANT: If the promise rejects, we must remove it from the cache
      // so that subsequent calls can retry the operation.
      promise.catch(() => {
        if (cache.current.get(key) === promise) {
          cache.current.delete(key);
        }
      });

      // Store the new promise in the cache and return it.
      cache.current.set(key, promise);
      return promise;
    },
    [asyncFn] // Re-create the function only if the original asyncFn changes.
  );

  return cachedFn;
}
