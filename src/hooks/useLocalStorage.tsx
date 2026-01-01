import { ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";


type LocalStorageState = Record<string, any>;

interface LocalStorageContextType {
  state: LocalStorageState;
  setState: (key: string, value: any | ((prev: any) => any)) => void;
  removeKey: (key: string) => void;
}

const LocalStorageContext = createContext<LocalStorageContextType>({
  state: {},
  setState: () => {},
  removeKey: () => {},
});

const STORAGE_KEY = "__app_storage__";
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit (most browsers support 5-10MB)

function getStorageSize(obj: any): number {
  try {
    return JSON.stringify(obj).length;
  } catch {
    return 0;
  }
}

function cleanupLargestItems(state: LocalStorageState, targetSize: number): LocalStorageState {
  const entries = Object.entries(state);
  // Calculate sizes once and sort by size, largest first
  const entriesWithSizes = entries.map(([key, value]) => ({ key, value, size: getStorageSize(value) }));
  entriesWithSizes.sort((a, b) => b.size - a.size);

  const newState = { ...state };
  let currentSize = getStorageSize(newState);

  // Remove largest items until we're under target size
  for (const { key } of entriesWithSizes) {
    if (currentSize <= targetSize) break;
    const itemSize = getStorageSize(newState[key]);
    delete newState[key];
    currentSize -= itemSize;
    console.warn(`Removed localStorage key "${key}" due to size constraints`);
  }

  return newState;
}

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
          console.warn('localStorage size limit exceeded, cleaning up...');
          newState = cleanupLargestItems(newState, MAX_STORAGE_SIZE * 0.8);
        }

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, cleaning up...');
          newState = cleanupLargestItems(prevState, MAX_STORAGE_SIZE * 0.7);
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          } catch (secondError) {
            console.error('Failed to save to localStorage even after cleanup:', secondError);
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

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  initializeWithValue?: boolean;
};

export function useLocalStorage<T>(key: string, initialValue: T | (() => T), options: UseLocalStorageOptions<T> = {}) {
  const getDefaultValue = useCallback(() => {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }, [initialValue]);

  const serializer = useCallback((value: T) => {
    if (options.serializer) {
      return options.serializer(value);
    }
    return value;
  }, [options.serializer]);

  const deserializer = useCallback((value: any): T => {
    if (options.deserializer && typeof value === "string") {
      return options.deserializer(value);
    }

    if (value === undefined || value === null) {
      return getDefaultValue();
    }

    return value as T;
  }, [options.deserializer, getDefaultValue]);

  const contextSetState = useContextSelector(LocalStorageContext, (ctx) => ctx.setState);
  const contextRemoveKey = useContextSelector(LocalStorageContext, (ctx) => ctx.removeKey);

  const storedValue = useContextSelector(LocalStorageContext, (ctx) => {
    const rawValue = ctx.state[key];
    if (rawValue === undefined) {
      return getDefaultValue();
    }
    return deserializer(rawValue);
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (value instanceof Function) {
        contextSetState(key, (currentRaw: any) => {
          const currentValue = deserializer(currentRaw);
          const newValue = value(currentValue);
          return serializer(newValue);
        });
      } else {
        contextSetState(key, serializer(value));
      }
    },
    [key, serializer, contextSetState, deserializer]
  );

  const removeValue = useCallback(() => {
    contextRemoveKey(key);
  }, [key, contextRemoveKey]);

  return {
    storedValue,
    defaultValues: getDefaultValue(),
    setStoredValue: setValue,
    removeValue,
  };
}
