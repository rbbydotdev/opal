import { useErrorToss } from "@/lib/errors/errorToss";
import { useEffect, useMemo, useRef, useState } from "react";

export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void | (() => void)>,
  deps: React.DependencyList
): void {
  const unsubRef = useRef<(() => void) | void>(() => {});

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const unsub = await effect(controller.signal);
        if (typeof unsub === "function") {
          if (!controller.signal.aborted) {
            unsubRef.current = unsub;
          } else {
            unsub();
          }
        }
      } catch (error) {
        // Ignore AbortError
        if (error instanceof Error && error.name !== "AbortError") {
          throw error;
        }
      }
    })();

    return () => {
      controller.abort();
      if (typeof unsubRef.current === "function") {
        unsubRef.current();
        unsubRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to run an async effect on mount and another on unmount.
 */
export const useAsyncEffect2 = (
  mountCallback: (signal: AbortSignal) => Promise<any>,
  deps: any[] = [],
  { unmountCallback, tossError }: { unmountCallback?: () => Promise<any>; tossError: boolean } = {
    tossError: true,
  }
): UseAsyncEffectResult => {
  const isMounted = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const [result, setResult] = useState<any>();
  const tossesError = useErrorToss();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    let mountSucceeded = false;

    const controller = new AbortController();
    void (async () => {
      await Promise.resolve(); // wait for the initial cleanup in Strict mode - avoids double mutation
      if (!isMounted.current || ignore) {
        return;
      }
      setIsLoading(true);
      try {
        const result = await mountCallback(controller.signal);
        mountSucceeded = true;
        if (isMounted.current && !ignore) {
          setError(undefined);
          setResult(result);
          setIsLoading(false);
        } else {
          // Component was unmounted before the mount callback returned, cancel it
          void unmountCallback?.();
        }
      } catch (error) {
        if (!isMounted.current) return;
        setError(error);
        if (tossError) tossesError(error as Error);
        setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
      if (mountSucceeded) {
        unmountCallback?.()
          .then(() => {
            if (!isMounted.current) return;
            setResult(undefined);
          })
          .catch((error: unknown) => {
            if (!isMounted.current) return;
            if (tossError) tossesError(error as Error);
            setError(error);
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useMemo(() => ({ result, error, isLoading }), [result, error, isLoading]);
};

export interface UseAsyncEffectResult {
  result: any;
  error: any;
  isLoading: boolean;
}
