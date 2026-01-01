import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useSingleItemExpander(id: string, defaultValue = false) {
  const { storedValue, setStoredValue: setValue } = useLocalStorage(id, defaultValue);
  const setExpand = (state: boolean) => setValue(state);
  console.log("useSingleItemExpander", id, storedValue);
  return [storedValue, setExpand] as const;
}
