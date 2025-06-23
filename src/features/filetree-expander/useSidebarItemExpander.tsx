"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCallback } from "react";

// For a single item, just store a boolean for the id

export function useSidebarItemExpander(id: string, defaultValue = false) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(id, defaultValue);

  // Toggle or set expanded state
  const setExpand = useCallback((state: boolean) => setExpanded(state), [setExpanded]);

  return [
    expanded, // boolean
    setExpand, // (state: boolean) => void
  ] as const;
}
