import { useEffect, useRef } from "react";

type TeardownableResource = { tearDown: () => void };

export function useResource<T extends TeardownableResource>(
  setup: () => T,
  deps: any[] = [],
  initialObj?: T
): T | null {
  const resource = useRef(initialObj ?? setup());
  useEffect(() => {
    if (resource.current) {
      resource.current.tearDown();
    }
    resource.current = setup();
    return () => {
      resource.current?.tearDown();
    };
  }, deps);

  return resource.current;
}
