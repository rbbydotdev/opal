import { LocalStorageContext } from "@/features/local-storage/LocalStorageProvider";
import { useCallback } from "react";
import { useContextSelector } from "use-context-selector";

function getStorageSize(obj: any): number {
  try {
    return JSON.stringify(obj).length;
  } catch {
    return 0;
  }
}

export type LocalStorageState = Record<string, any>;

export function cleanupLargestItems(state: LocalStorageState, targetSize: number): LocalStorageState {
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

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  initializeWithValue?: boolean;
};

export function useLocalStorage<T>(key: string, initialValue: T | (() => T), options: UseLocalStorageOptions<T> = {}) {
  const getDefaultValue = useCallback(() => {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }, [initialValue]);

  const serializer = useCallback(
    (value: T) => {
      if (options.serializer) {
        return options.serializer(value);
      }
      return value;
    },
    [options.serializer]
  );

  const deserializer = useCallback(
    (value: any): T => {
      if (options.deserializer && typeof value === "string") {
        return options.deserializer(value);
      }

      if (value === undefined || value === null) {
        return getDefaultValue();
      }

      return value as T;
    },
    [options.deserializer, getDefaultValue]
  );

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
