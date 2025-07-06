"use client";;
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useSingleItemExpander(id: string, defaultValue = false) {
  const [expanded, setExpanded] = useLocalStorage<boolean>(id, defaultValue);

  const setExpand = (state: boolean) => setExpanded(state);

  return [expanded, setExpand] as const;
}
