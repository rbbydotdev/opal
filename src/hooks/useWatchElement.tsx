import { useEffect, useState } from "react";

export function useWatchElement<T extends Element = Element>(selector: string) {
  const [element, setElement] = useState<T | null>(document.querySelector<T>(selector));

  useEffect(() => {
    let prevElement = document.querySelector<T>(selector);

    const observer = new MutationObserver(() => {
      const currentElement = document.querySelector<T>(selector);
      if (currentElement !== prevElement) {
        setElement(currentElement);
        prevElement = currentElement;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Clean up
    return () => observer.disconnect();
  }, [selector]);

  return element;
}
