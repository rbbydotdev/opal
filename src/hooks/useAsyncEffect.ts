import { useEffect, useRef } from "react";

export function useAsyncEffect(effect: () => Promise<void | (() => void)>, deps: React.DependencyList): void {
  const unsubRef = useRef<(() => void) | void>(() => {});

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const unsub = await effect();
      if (typeof unsub === "function") {
        if (isMounted) {
          unsubRef.current = unsub;
        } else {
          unsub();
        }
      }
    })();

    return () => {
      isMounted = false;
      if (typeof unsubRef.current === "function") {
        unsubRef.current();
        unsubRef.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
