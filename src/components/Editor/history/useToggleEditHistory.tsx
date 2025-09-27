import useLocalStorage2 from "@/hooks/useLocalStorage2";

export function useToggleEditHistory() {
  const { storedValue, setStoredValue } = useLocalStorage2("app/EditHistory", true);
  const toggle = () => setStoredValue(!storedValue);
  return { isEditHistoryEnabled: storedValue, toggleEditHistory: toggle };
}
