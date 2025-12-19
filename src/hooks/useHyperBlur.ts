import { useEffect } from "react";

export function useHyperBlur({
  containerRef,
  open,
  handleClose,
}: {
  containerRef: React.RefObject<HTMLElement>;
  handleClose: () => void;
  open: boolean;
}) {
  useEffect(() => {
    //because onBlur is not enough
    const handleFocusIn = (e: FocusEvent) => {
      if (open && containerRef.current && !containerRef.current?.contains(e.target as Node)) {
        handleClose();
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(document.activeElement as Node)) {
        handleClose();
      }
    };
    window.addEventListener("focusin", handleFocusIn, { passive: true });
    window.addEventListener("focusout", handleFocusOut, { passive: true });
    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, [containerRef, handleClose, open]);
}

export function handleHyperBlur({
  element,
  open,
  handleClose,
}: {
  element: HTMLElement | null;
  open: boolean;
  handleClose: () => void;
}) {
  //because onBlur is not enough
  const handleFocusIn = (e: FocusEvent) => {
    if (open && element && !element.contains(e.target as Node)) {
      handleClose();
    }
  };
  const handleFocusOut = (e: FocusEvent) => {
    if (open && element && !element.contains(e.relatedTarget as Node)) {
      handleClose();
    }
  };
  const controller = new AbortController();
  window.addEventListener("focusin", handleFocusIn, { passive: true, signal: controller.signal });
  window.addEventListener("focusout", handleFocusOut, { passive: true, signal: controller.signal });
  return () => controller.abort();
}
