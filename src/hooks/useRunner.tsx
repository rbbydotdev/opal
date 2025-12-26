import { Runner } from "@/types/RunnerInterfaces";
import { useEffect, useState, useSyncExternalStore } from "react";

export function useRunner<T extends Runner>(initialValue: T | (() => T), deps: any[]) {
  const [currentRunner, setRunner] = useState<T>(initialValue);
  useEffect(() => {
    setRunner(typeof initialValue === "function" ? initialValue() : initialValue);
    return () => {
      currentRunner.tearDown();
    };
  }, deps);
  useEffect(() => currentRunner.tearDown, [currentRunner]);
  const status = useSyncExternalStore(currentRunner.onStatus, () => currentRunner.status);
  const logs = useSyncExternalStore(currentRunner.onLog, () => currentRunner.logs);
  const error = useSyncExternalStore(currentRunner.onError, () => currentRunner.error);
  const execute = async (runner: T) => {
    setRunner(runner);
    await runner.execute();
  };

  return {
    setRunner,
    execute,
    runner: currentRunner as Omit<T, "execute">,
    logs,
    status,
    error,
  };
}
