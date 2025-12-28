import { AbortError } from "@/lib/errors/errors";
import { useEffect, useRef } from "react";

export function useModalSignal(isOpen: boolean, reason?: string) {
  //  DOMException(msg, "AbortError")
  const abortController = useRef<AbortController | null>(null);
  useEffect(() => {
    // If modal has opened: create a new controller
    if (isOpen) {
      abortController.current = new AbortController();
      return () => {
        // Abort on unmount or when modal closes

        abortController.current?.abort(new AbortError(reason));
        abortController.current = null;
      };
    } else {
      // If modal is closed: ensure any pending operations are cancelled
      abortController.current?.abort(new AbortError(reason));
      abortController.current = null;
    }
  }, [isOpen, reason]);
  return abortController;
}
