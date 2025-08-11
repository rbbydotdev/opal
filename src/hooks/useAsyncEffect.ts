import { useEffect, useRef } from "react";

export function useAsyncEffect(effect: () => Promise<void | (() => void)>, deps: React.DependencyList): void {
  const unsubRef = useRef<(() => void) | void>(() => {});

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const unsub = await effect();
      if (isMounted) {
        unsubRef.current = unsub;
      } else if (typeof unsub === "function") {
        // If unmounted before unsub is set, call it immediately
        unsub();
      }
    })();

    return () => {
      isMounted = false;
      if (typeof unsubRef.current === "function") {
        unsubRef.current();
        unsubRef.current = undefined;
      }
    };
  }, deps);
}
