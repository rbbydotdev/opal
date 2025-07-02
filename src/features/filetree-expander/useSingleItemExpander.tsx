"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCallback } from "react";

export function useSingleItemExpander(id: string, defaultValue = false) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(id, defaultValue);

  const setExpand = useCallback((state: boolean) => setExpanded(state), [setExpanded]);

  return [expanded, setExpand] as const;
}
