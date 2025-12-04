import { useCallback, useLayoutEffect, useRef, useState } from "react";

declare global {
  interface WindowEventMap {
    "local-storage": CustomEvent;
  }
}

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  initializeWithValue?: boolean;
};

const IS_SERVER = typeof window === "undefined";

/**
 * Hook for persisting state to localStorage.
 *
 * @param {string} key - The key to use for localStorage.
 * @param {T | (() => T)} initialValue - The initial value to use, if not found in localStorage.
 * @param {UseLocalStorageOptions<T>} options - Options for the hook.
 * @returns A tuple of [storedValue, setValue, removeValue].
 */
export function useLocalStorage<T>(key: string, initialValue: T | (() => T), options: UseLocalStorageOptions<T> = {}) {
  const initialValueRef = useRef<T | (() => T)>(initialValue);
  // const { initializeWithValue = true } = options;
  const optionsRef = useRef<UseLocalStorageOptions<T>>(options);

  const serializer = (value: T) => {
    if (optionsRef.current.serializer) {
      return optionsRef.current.serializer(value);
    }

    return JSON.stringify(value);
  };

  const deserializer = useCallback((value: string): T => {
    if (optionsRef.current.deserializer) {
      return optionsRef.current.deserializer(value);
    }
    // Support 'undefined' as a value
    if (value === "undefined") {
      return undefined as unknown as T;
    }

    const defaultValue =
      initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return defaultValue; // Return initialValue if parsing fails
    }

    return parsed as T;
  }, []);

  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = useCallback((): T => {
    const initialValueToUse =
      initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;

    // Prevent build error "window is undefined" but keep working
    if (IS_SERVER) {
      return initialValueToUse;
    }

    try {
      const raw = window.localStorage.getItem(key);
      return raw ? deserializer(raw) : initialValueToUse;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValueToUse;
    }
  }, [deserializer, key]);

  const [stateValue, setStateValue] = useState<T>(() => {
    if (optionsRef.current?.initializeWithValue) {
      return readValue();
    }

    return initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: typeof setStateValue = (value) => {
    // Prevent build error "window is undefined" but keeps working
    if (IS_SERVER) {
      console.warn(`Tried setting localStorage key “${key}” even though environment is not a client`);
    }

    try {
      // Allow value to be a function so we have the same API as useState
      const newValue = value instanceof Function ? value(readValue()) : value;

      // Save to local storage
      window.localStorage.setItem(key, serializer(newValue));

      // Save state
      setStateValue(newValue);

      // We dispatch a custom event so every similar useLocalStorage hook is notified
      window.dispatchEvent(new StorageEvent("local-storage", { key }));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  const removeValue = useCallback(() => {
    // Prevent build error "window is undefined" but keeps working
    if (IS_SERVER) {
      console.warn(`Tried removing localStorage key “${key}” even though environment is not a client`);
    }

    const defaultValue =
      initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;

    // Remove the key from local storage
    window.localStorage.removeItem(key);

    // Save state with default value
    setStateValue(defaultValue);

    // We dispatch a custom event so every similar useLocalStorage hook is notified
    window.dispatchEvent(new StorageEvent("local-storage", { key }));
  }, [key]);

  useLayoutEffect(() => {
    setStateValue(readValue());
  }, [key, readValue]);

  const handleStorageChange = useCallback(
    (event: StorageEvent | CustomEvent) => {
      if ((event as StorageEvent).key && (event as StorageEvent).key !== key) {
        return;
      }
      setStateValue(readValue());
    },
    [key, readValue]
  );

  useLayoutEffect(() => {
    addEventListener("storage", handleStorageChange);
    // this is a custom event, triggered in writeValueToLocalStorage
    addEventListener("local-storage", handleStorageChange);
    return () => {
      removeEventListener("storage", handleStorageChange);
      removeEventListener("local-storage", handleStorageChange);
    };
  }, [handleStorageChange]);

  return {
    storedValue: stateValue,
    defaultValues: (initialValue instanceof Function ? initialValue() : initialValue) as T,
    setStoredValue: setValue,
    removeValue,
  };
}
