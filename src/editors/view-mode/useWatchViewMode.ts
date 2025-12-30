import { ViewMode } from "@mdxeditor/editor";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

export function useWatchViewMode(): [ViewMode | null, (value: ViewMode | null) => void] {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const viewMode = (search.viewMode as ViewMode | null) || null;

  const setViewMode = useCallback(
    (value: ViewMode | null) => {
      void navigate({
        search: ((prev: typeof search) => ({
          ...prev,
          viewMode: value || undefined,
        })) as any,
      });
    },
    [navigate]
  );

  return [viewMode, setViewMode];
}
