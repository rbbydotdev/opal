import { useEffect, useRef, useState } from "react";

type TeardownableResource = {
  tearDown: () => void;
  init?: () => () => void | void;
};

export function useResource<T extends TeardownableResource>(setup: () => T, deps: any[] = [], initialObj?: T) {
  const resource = useRef(initialObj ?? setup());

  useEffect(() => {
    // Create new resource (previous one will be cleaned by prior effect cleanup)
    // (On first run there is no prior cleanup; we replace the eager one to keep semantics)
    if (resource.current) {
      resource.current.tearDown(); // tear down the eager (or previous) instance before replacing
    }
    resource.current = setup();

    const unsubs: Array<() => void> = [];

    if (resource.current.init) {
      const maybeUnsub = resource.current.init();
      if (typeof maybeUnsub === "function") {
        unsubs.push(maybeUnsub);
      }
    }

    // Always add teardown as a final unsubscribe
    unsubs.push(() => {
      resource.current?.tearDown();
    });

    return () => {
      for (const u of unsubs) {
        try {
          u();
        } catch {
          // swallow to avoid breaking React cleanup chain
        }
      }
    };
  }, deps);

  return resource.current!;
}

export function useRemoteResource<T extends TeardownableResource>(
  setup: () => Promise<T>,
  deps: any[] = [],
  initialObj?: T
) {
  const resourceRef = useRef<T | undefined>(initialObj);
  const generationRef = useRef(0);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const generation = ++generationRef.current;

    // Tear down any current (eager or previous) resource immediately (mirror useResource)
    if (resourceRef.current) {
      try {
        resourceRef.current.tearDown();
      } catch {
        /* swallow */
      }
      resourceRef.current = undefined;
      forceRender((v) => v + 1);
    }

    let initUnsub: (() => void) | undefined;
    let resolvedResource: T | undefined;

    void (async () => {
      let next: T;
      try {
        next = await setup();
      } catch {
        if (cancelled) return;
        return;
      }

      // If this effect is obsolete, tear down the newly created resource right away
      if (cancelled || generationRef.current !== generation) {
        try {
          next.tearDown();
        } catch {
          /* swallow */
        }
        return;
      }

      resolvedResource = next;
      resourceRef.current = next;

      try {
        if (next.init) {
          const maybeUnsub = next.init();
          if (typeof maybeUnsub === "function") {
            initUnsub = maybeUnsub;
          }
        }
      } catch {
        // If init throws, still allow tearDown in cleanup
      }

      forceRender((v) => v + 1);
    })();

    return () => {
      cancelled = true;

      // Run init unsubscribe first
      if (initUnsub) {
        try {
          initUnsub();
        } catch {
          /* swallow */
        }
      }

      // Tear down resolved resource for this generation
      if (resolvedResource) {
        try {
          resolvedResource.tearDown();
        } catch {
          /* swallow */
        }
        // Clear only if the current resource is still the one resolved by this effect
        if (resourceRef.current === resolvedResource) {
          resourceRef.current = undefined;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return resourceRef.current;
}
