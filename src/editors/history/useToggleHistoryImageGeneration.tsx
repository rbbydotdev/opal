import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useToggleHistoryImageGeneration() {
  const { storedValue, setStoredValue } = useLocalStorage("app/EditHistoryImageGeneration", false);
  const toggle = () => setStoredValue(!storedValue);

  return { isHistoryImageGenerationEnabled: storedValue, toggleHistoryImageGeneration: toggle };
}
