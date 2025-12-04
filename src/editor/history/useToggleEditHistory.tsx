import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useToggleEditHistory() {
  const { storedValue, setStoredValue } = useLocalStorage("app/EditHistory", false);
  const toggle = () => setStoredValue(!storedValue);
  return { isEditHistoryEnabled: storedValue, toggleEditHistory: toggle };
}
