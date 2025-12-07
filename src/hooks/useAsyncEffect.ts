import { useEffect, useRef } from "react";

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
