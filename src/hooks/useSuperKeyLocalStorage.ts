import { useCallback, useEffect, useState } from "react";

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
