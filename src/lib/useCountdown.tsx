import { useEffect, useRef, useState } from "react";

export function useCountdown({
  seconds,
  onComplete,
  enabled,
}: {
  seconds: number;
  onComplete: () => void;
  enabled: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete).current;
  const isEnabledRef = useRef(enabled);
  const [userCancelled, setUserCancelled] = useState(false);

  const pauseCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isEnabledRef.current = false;
    }
  };

  const cancel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      setRemaining(seconds);
      isEnabledRef.current = false;
      setUserCancelled(true);
    }
  };

  useEffect(() => {
    if (!enabled || userCancelled) return;
    isEnabledRef.current = enabled;
    if (remaining <= 0) return onCompleteRef();
    const interval = (intervalRef.current = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000));
    return () => {
      clearInterval(interval);
      isEnabledRef.current = false;
    };
  }, [remaining, enabled, onCompleteRef, userCancelled]);

  return { remaining, cancel, enabled: enabled && !userCancelled, pauseCountdown };
}
