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
      setStoredValue(getInitialValue() as T);
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

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue as T);
    } catch (error) {
      console.error("Error clearing localStorage", error);
    }
  }, [initialValue, key]);

  return [storedValue, setValue, clear] as const;
}

export function useSuperKeyLocalStorage<T>(superKey: string, key: string, initialValue: T | (() => T)) {
  const isServer = typeof window === "undefined";

  // Helper to get the full object for the superKey
  const getSuperObject = useCallback((): Record<string, unknown> => {
    try {
      const item = window.localStorage.getItem(superKey);
      return item ? (JSON.parse(item) as Record<string, unknown>) : {};
    } catch (error) {
      console.error("Error accessing localStorage", error);
      return {};
    }
  }, [superKey]);

  // Helper to get the value for this key
  const getInitialValue = useCallback(() => {
    const superObj = getSuperObject();
    if (superObj && typeof superObj === "object" && superObj !== null && key in superObj) {
      return superObj[key];
    }
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  }, [getSuperObject, initialValue, key]);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(
    () =>
      isServer
        ? typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue
        : (undefined as unknown as T) // Ensure the state is undefined on the server
  );

  useEffect(() => {
    if (!isServer) {
      setStoredValue(getInitialValue() as T);
    }
  }, [getInitialValue, isServer]);

  // Set value for this key inside the superKey object
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        const superObj = getSuperObject();
        superObj[key] = valueToStore;
        window.localStorage.setItem(superKey, JSON.stringify(superObj));
      } catch (error) {
        console.error("Error setting localStorage value", error);
      }
    },
    [key, storedValue, superKey, getSuperObject]
  );

  // Listen for changes to the superKey object
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === superKey) {
        try {
          const superObj = event.newValue ? JSON.parse(event.newValue) : {};
          if (superObj && typeof superObj === "object" && superObj !== null) {
            setStoredValue(
              ((superObj as Record<string, unknown>)[key] as T) ??
                (typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
            );
          } else {
            setStoredValue(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue);
          }
        } catch (error) {
          console.error("Error parsing localStorage change", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [superKey, key, initialValue]);

  // Remove just this key from the superKey object
  const clear = useCallback(() => {
    try {
      const superObj = getSuperObject();
      delete superObj[key];
      window.localStorage.setItem(superKey, JSON.stringify(superObj));
      setStoredValue(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue);
    } catch (error) {
      console.error("Error clearing localStorage", error);
    }
  }, [key, superKey, initialValue, getSuperObject]);

  // Remove the entire superKey object
  const clearSuperKey = useCallback(() => {
    try {
      window.localStorage.removeItem(superKey);
    } catch (error) {
      console.error("Error clearing superKey from localStorage", error);
    }
  }, [superKey]);

  return [storedValue, setValue, clear, clearSuperKey] as const;
}
