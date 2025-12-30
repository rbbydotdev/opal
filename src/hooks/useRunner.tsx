import { AbortError } from "@/lib/errors/errors";
import { Runner } from "@/types/RunnerInterfaces";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";

export function useRunner<T extends Runner>(initialValue: T | (() => T), deps: any[], abortSignal?: AbortSignal) {
  const [currentRunner, setRunner] = useState<T>(initialValue);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRunner(typeof initialValue === "function" ? initialValue() : initialValue);
    return currentRunner.tearDown;
  }, deps);
  useEffect(() => currentRunner.tearDown, [currentRunner]);

  const { status, logs, error } = useSnapshot(currentRunner.target);
  const execute = useCallback(
    (runner: T, options?: { signal?: AbortSignal }) => {
      // Create a new abort controller for this execution
      abortControllerRef.current = new AbortController();

      setRunner(runner);
      return runner.run({
        abortSignal: AbortSignal.any([abortControllerRef.current.signal, abortSignal, options?.signal].filter(Boolean)),
      }) as ReturnType<T["run"]>;
    },
    [abortSignal]
  );

  const currentRunnerRef = useRef(currentRunner);
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(new AbortError("Operation cancelled by user"));
      abortControllerRef.current = null;
    }
    currentRunnerRef.current.cancel();
  }, []);

  return {
    setRunner,
    execute,
    cancel,
    runner: currentRunner as Omit<T, "execute">,
    logs,
    status,
    error,
  };
}
