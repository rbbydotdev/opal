import { Runner } from "@/types/RunnerInterfaces";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export interface UsableRunner<T extends Runner, P, R> {
  Create: (args: P) => T;
  Recall: (args: R) => Promise<T>;
}
export function useRunner<T extends Runner, P, R>(usableRunner: UsableRunner<T, P, R>, createParamsFn: () => P) {
  const [currentRunner, setRunner] = useState(() => usableRunner.Create(createParamsFn()));

  const status = useSyncExternalStore(currentRunner.onStatus, () => currentRunner.status);
  const logs = useSyncExternalStore(currentRunner.onLog, () => currentRunner.logs);
  const error = useSyncExternalStore(currentRunner.onError, () => currentRunner.error);

  useEffect(() => currentRunner.tearDown, [currentRunner]);

  const create = useCallback(
    (args: P) => {
      const newRunner = usableRunner.Create(args);
      setRunner(newRunner);
      return newRunner;
    },
    [usableRunner]
  );

  const recall = useCallback(
    async (args: R) => {
      const recalledRunner = await usableRunner.Recall(args);
      setRunner(recalledRunner);
      return recalledRunner;
    },
    [usableRunner]
  );

  return {
    runner: currentRunner,
    logs,
    isPending: status === "pending",
    isCompleted: status === "success" || status === "error",
    isIdle: status === "idle",
    isFailed: status === "error",
    isSuccess: status === "success",
    status,
    create,
    recall,
    error,
  };
}
