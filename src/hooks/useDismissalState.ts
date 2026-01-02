import { useEffect, useState } from "react";

export function useDismissalState(key: string, defaultValue: boolean = false) {
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setState(JSON.parse(stored) as any);
      }
    } catch {
      // localStorage failed, use state fallback
    }
  }, [key]);

  const setDismissalState = (value: boolean) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage failed, state will still be updated
    }
  };

  return [state, setDismissalState] as const;
}
