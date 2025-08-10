import useLocalStorage2 from "@/hooks/useLocalStorage2";

export function useSingleItemExpander(id: string, defaultValue = false) {
  const { storedValue, setStoredValue: setValue } = useLocalStorage2(id, defaultValue);
  const setExpand = (state: boolean) => setValue(state);
  return [storedValue, setExpand] as const;
}
