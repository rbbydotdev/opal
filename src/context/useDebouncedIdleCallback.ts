import { useCallback, useEffect, useRef } from "react";

type IdleCallbackHandle = number;
type TimeoutHandle = ReturnType<typeof setTimeout>;

interface DebounceIdleHandle {
  timeout: TimeoutHandle | null;
  idle: IdleCallbackHandle | null;
  cancel: (() => void) | null;
}

export function useDebouncedIdleCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay = 250,
  idleTimeout = 500
) {
  const handleRef = useRef<DebounceIdleHandle>({
    timeout: null,
    idle: null,
    cancel: null,
  });

  // Cancel any pending callbacks
  const cancel = useCallback(() => {
    if (handleRef.current.timeout !== null) {
      clearTimeout(handleRef.current.timeout);
      handleRef.current.timeout = null;
    }
    if (handleRef.current.idle !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(handleRef.current.idle);
      handleRef.current.idle = null;
    }
    if (handleRef.current.cancel) {
      handleRef.current.cancel();
      handleRef.current.cancel = null;
    }
  }, []);

  // Debounced function
  const debounced = useCallback(
    (...args: T) => {
      cancel();

      handleRef.current.timeout = setTimeout(() => {
        handleRef.current.timeout = null;

        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          handleRef.current.idle = window.requestIdleCallback(
            () => {
              handleRef.current.idle = null;
              fn(...args);
            },
            { timeout: idleTimeout }
          );
        } else {
          handleRef.current.timeout = setTimeout(() => {
            handleRef.current.timeout = null;
            fn(...args);
          }, idleTimeout);
        }
      }, delay);
    },
    [fn, delay, idleTimeout, cancel]
  );

  // Cleanup on unmount
  useEffect(() => cancel, [cancel]);

  return debounced;
}
