import useLocalStorage2 from "@/hooks/useLocalStorage2";

export function useToggleHistoryImageGeneration() {
  const { storedValue, setStoredValue } = useLocalStorage2("app/EditHistoryImageGeneration", false);
  const toggle = () => setStoredValue(!storedValue);
  return { isHistoryImageGenerationEnabled: storedValue, toggleHistoryImageGeneration: toggle };
}
