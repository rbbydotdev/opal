"use client";

import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const isServer = typeof window === "undefined";

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(
    () =>
      isServer
        ? typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue
        : (undefined as unknown as T) // Ensure the state is undefined on the server
  );

  const getInitialValue = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item
        ? (JSON.parse(item) as T)
        : typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    } catch (error) {
      console.error("Error accessing localStorage", error);
      return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
    }
  }, [initialValue, key]);

  useEffect(() => {
    if (!isServer) {
      setStoredValue(getInitialValue());
    }
  }, [getInitialValue, isServer]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error("Error setting localStorage value", error);
      }
    },
    [key, storedValue]
  );

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        try {
          const newValue = event.newValue ? JSON.parse(event.newValue) : getInitialValue();
          setStoredValue(newValue as T);
        } catch (error) {
          console.error("Error parsing localStorage change", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [getInitialValue, key]);

  return [storedValue, setValue] as const;
}
