import { useEffect, useRef, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  const isServer = typeof window === "undefined";

  // Cache the initial value so it doesn't change on every render
  const initialValueRef = useRef(initialValue);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (isServer) {
      return typeof initialValueRef.current === "function"
        ? (initialValueRef.current as () => T)()
        : initialValueRef.current;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch (_error) {
      // ignore
    }
    return typeof initialValueRef.current === "function"
      ? (initialValueRef.current as () => T)()
      : initialValueRef.current;
  });

  // Only depends on key
  const getInitialValue = () => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch (_error) {
      // ignore
    }
    return typeof initialValueRef.current === "function"
      ? (initialValueRef.current as () => T)()
      : initialValueRef.current;
  };

  // Only run on mount or when key changes
  useEffect(() => {
    if (!isServer) {
      setStoredValue(getInitialValue());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Don't include getInitialValue or initialValue

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error setting localStorage value", error);
    }
  };

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

  const clear = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(
        typeof initialValueRef.current === "function" ? (initialValueRef.current as () => T)() : initialValueRef.current
      );
    } catch (error) {
      console.error("Error clearing localStorage", error);
    }
  };

  return [storedValue, setValue, clear] as const;
}
