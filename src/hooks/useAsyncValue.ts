import { useEffect, useState } from "react";

export function useAsyncValue<T>(asyncFn: () => Promise<T>, deps: any[] = []): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    void asyncFn().then((result) => {
      if (!cancelled) setValue(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
