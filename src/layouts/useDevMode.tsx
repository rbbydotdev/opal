import { useLocalStorage } from "@/features/local-storage/useLocalStorage";

export function useDevMode() {
  const { storedValue: devMode, setStoredValue } = useLocalStorage("App/devMode", false);
  return {
    devMode,
    toggleDevMode: () => setStoredValue((v) => !v),
  };
}
