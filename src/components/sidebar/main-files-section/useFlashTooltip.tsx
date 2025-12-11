import { useRef, useState } from "react";

export function useFlashTooltip(duration = 3000) {
  const [tooltipOpen, setToolTipOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toggleTooltip = () => {
    setToolTipOpen((state) => {
      const newState = !state;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (newState) {
        timeoutRef.current = setTimeout(() => {
          setToolTipOpen(false);
        }, duration);
      }
      return newState;
    });
  };
  return [tooltipOpen, toggleTooltip] as const;
}
