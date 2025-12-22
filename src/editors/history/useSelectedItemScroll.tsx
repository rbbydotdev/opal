import { useEffect, useRef } from "react";

export function useSelectedItemScroll({ isOpen }: { isOpen: boolean }) {
  const didScrollRef = useRef(false);
  useEffect(() => {
    // Reset the flag when the menu closes
    if (!isOpen) {
      didScrollRef.current = false;
    }
  }, [isOpen]);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const updateSelectedItemRef = (node: HTMLDivElement | null) => {
    selectedItemRef.current = node;
    if (node && isOpen && !didScrollRef.current) {
      didScrollRef.current = true;
      requestAnimationFrame(() => {
        if (!scrollAreaRef.current) return;
        const itemRect = node.getBoundingClientRect();
        const viewport = scrollAreaRef.current;
        const viewportRect = viewport.getBoundingClientRect();
        const offsetTop = node.offsetTop;

        const scrollTo = offsetTop - viewportRect.height / 2 + itemRect.height / 2;
        viewport.scrollTop = Math.max(0, Math.min(scrollTo, viewport.scrollHeight - viewportRect.height));
      });
    }
  };
  return {
    updateSelectedItemRef,
    scrollAreaRef,
  };
}
