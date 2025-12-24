import { RequestSignalsInstance } from "@/lib/service-worker/RequestSignalInstance";
import { useEffect, useRef, useState } from "react";

export const useRequestSignals = () => {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return RequestSignalsInstance.initAndWatch((count) => {
      if (count <= 0) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          setPending(false);
        }, 1000);
      } else if (!pending) {
        setPending(true);
      }
    });
  }, [pending]);
  return { pending };
};
