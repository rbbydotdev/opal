import { useEffect, useRef, useState } from "react";

export function useWatchElement<T extends Element = Element>(
  selector: string,
  parentNode: HTMLElement = document.body
): T | null {
  const [element, setElement] = useState<T | null>(parentNode.querySelector<T>(selector));
  const weakRef = useRef<WeakRef<T> | null>(element ? new WeakRef(element) : null);

  useEffect(() => {
    const prevElement = document.querySelector<T>(selector);
    weakRef.current = prevElement ? new WeakRef(prevElement) : null;

    const observer = new MutationObserver(() => {
      const currentElement = document.querySelector<T>(selector);
      const prev = weakRef.current?.deref() ?? null;
      if (currentElement !== prev) {
        setElement(currentElement);
        weakRef.current = currentElement ? new WeakRef(currentElement) : null;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [selector]);

  return element;
}
