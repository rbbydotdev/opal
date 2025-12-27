import { useEffect, useRef } from "react";

export function useModalSignal(isOpen: boolean) {
  const abortController = useRef<AbortController | null>(null);
  useEffect(() => {
    // If modal has opened: create a new controller
    if (isOpen) {
      abortController.current = new AbortController();
      return () => {
        // Abort on unmount or when modal closes

        abortController.current?.abort();
        abortController.current = null;
      };
    } else {
      // If modal is closed: ensure any pending operations are cancelled
      abortController.current?.abort();
      abortController.current = null;
    }
  }, [isOpen]);
  return abortController;
}
