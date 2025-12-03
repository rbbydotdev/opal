import { useEffect, useState } from "react";

/**
 * A custom hook that debounces a value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes or the component unmounts.
    // This is the core of the debounce logic.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run the effect only if the value or delay changes

  return debouncedValue;
}
