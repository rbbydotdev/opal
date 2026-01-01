import { cleanupLargestItems, LocalStorageState } from "@/features/local-storage/useLocalStorage";
import { ReactNode, useCallback, useLayoutEffect, useState } from "react";
import { createContext } from "use-context-selector";

export function LocalStorageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocalStorageState>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn("Error reading localStorage:", error);
      return {};
    }
  });

  const updateState = useCallback((key: string, value: any | ((prev: any) => any)) => {
    setState((prevState) => {
      const currentValue = prevState[key];
      const newValue = value instanceof Function ? value(currentValue) : value;
      let newState = { ...prevState, [key]: newValue };

      try {
        const serializedState = JSON.stringify(newState);

        // Check if the new state exceeds size limit
        if (serializedState.length > MAX_STORAGE_SIZE) {
          console.warn("localStorage size limit exceeded, cleaning up...");
          newState = cleanupLargestItems(newState, MAX_STORAGE_SIZE * 0.8);
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        if (error instanceof Error && error.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded, cleaning up...");
          newState = cleanupLargestItems(prevState, MAX_STORAGE_SIZE * 0.7);
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (secondError) {
            console.error("Failed to save to localStorage even after cleanup:", secondError);
            return prevState;
          }
        } else {
          console.warn("Error writing to localStorage:", error);
          return prevState;
        }
      }
      return newState;
    });
  }, []);

  const removeKey = useCallback((key: string) => {
    setState((prevState) => {
      const { [key]: removed, ...newState } = prevState;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.warn("Error writing to localStorage:", error);
        return prevState;
      }
      return newState;
    });
  }, []);

  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        setState(JSON.parse(event.newValue) as any);
      } catch (error) {
        console.warn("Error parsing localStorage change:", error);
      }
    }
  }, []);

  useLayoutEffect(() => {
    addEventListener("storage", handleStorageChange);
    return () => removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);

  const contextValue = {
    state,
    setState: updateState,
    removeKey,
  };

  return <LocalStorageContext.Provider value={contextValue}>{children}</LocalStorageContext.Provider>;
}
export const LocalStorageContext = createContext<LocalStorageContextType>({
  state: {},
  setState: () => {},
  removeKey: () => {},
});
export const STORAGE_KEY = "__app_storage__";
export const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit (most browsers support 5-10MB)

export interface LocalStorageContextType {
  state: LocalStorageState;
  setState: (key: string, value: any | ((prev: any) => any)) => void;
  removeKey: (key: string) => void;
}
