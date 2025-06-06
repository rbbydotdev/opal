import { useCallback, useState } from "react";
export function useErrorToss() {
  const [_, setState] = useState(null);
  const toss = useCallback((err: Error) => {
    setState(() => {
      throw err;
    });
  }, []);
  return toss;
}
