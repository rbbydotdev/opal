import { useState } from "react";
export function useErrorToss() {
  const [_, setState] = useState(null);
  const toss = (err: Error) => {
    setState(() => {
      throw err;
    });
    return err;
  };
  return toss;
}
