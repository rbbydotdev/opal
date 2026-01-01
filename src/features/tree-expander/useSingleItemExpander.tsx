import { useLocalStorage } from "@/features/local-storage/useLocalStorage";

export function useSingleItemExpander(id: string, defaultValue = false) {
  const { storedValue, setStoredValue: setValue } = useLocalStorage(id, defaultValue);
  const setExpand = (state: boolean) => setValue(state);
  return [storedValue, setExpand] as const;
}
