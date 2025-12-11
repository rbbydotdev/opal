import { useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

type UrlParamType = "hash" | "search" | "hash+search";

interface UseUrlParamOptions<T> {
  key: string;
  paramType?: UrlParamType;
  parser: (value: string | null) => T;
  serializer: (value: T) => string;
}

export function useUrlParam<T>({
  key,
  paramType = "hash",
  parser,
  serializer,
}: UseUrlParamOptions<T>): [value: T, setValue: (value: T) => void, clearParam: () => void] {
  const location = useLocation();
  const navigate = useNavigate();

  // Directly derive value from location's parsed fields - single source of truth
  const value = useMemo(() => {
    let rawValue: string | null = null;

    if (paramType === "hash") {
      // TanStack Router's location.hash doesn't include the # prefix
      rawValue = new URLSearchParams(location.hash).get(key);
    } else if (paramType === "search") {
      // Use location's parsed search parameters
      rawValue = (location.search as any)?.[key] ?? new URLSearchParams(location.search).get(key);
    } else {
      // hash+search: prefer hash, fallback to search
      const hashValue = new URLSearchParams(location.hash).get(key);
      const searchValue = (location.search as any)?.[key] ?? new URLSearchParams(location.search).get(key);
      rawValue = hashValue || searchValue;
    }

    return parser(rawValue);
  }, [key, paramType, parser, location.hash, location.search]);

  // Update URL through TanStack Router navigation
  const setValue = useCallback(
    (newValue: T) => {
      const serializedValue = serializer(newValue);

      if (paramType === "hash") {
        const params = new URLSearchParams(location.hash);
        params.set(key, serializedValue);
        void navigate({ hash: params.toString() });
      } else if (paramType === "search") {
        // Try to use location's search object structure if available
        void navigate({
          search: {
            ...(typeof location.search === "object" ? location.search : {}),
            [key]: serializedValue,
          } as any,
        });
      } else {
        // hash+search: default to hash
        const params = new URLSearchParams(location.hash);
        params.set(key, serializedValue);
        void navigate({ hash: params.toString() });
      }
    },
    [key, paramType, serializer, location.hash, location.search, navigate]
  );

  // Clear param through TanStack Router navigation
  const clearParam = useCallback(() => {
    if (paramType === "hash") {
      void navigate({ hash: "" });
    } else if (paramType === "search") {
      const newSearch = { ...(typeof location.search === "object" ? location.search : {}) };
      delete (newSearch as any)[key];
      void navigate({ search: newSearch as any });
    } else {
      // hash+search: clear both
      const newSearch = { ...(typeof location.search === "object" ? location.search : {}) };
      delete (newSearch as any)[key];
      void navigate({ hash: "", search: newSearch as any });
    }
  }, [paramType, key, location.search, navigate]);

  return [value, setValue, clearParam];
}
