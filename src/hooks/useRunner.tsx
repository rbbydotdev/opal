import { Runner } from "@/types/RunnerInterfaces";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export interface UsableRunner<T extends Runner = Runner> {
  Create: (args: any) => T;
  Recall: (args: any) => Promise<T>;
}
// Enhanced hook that provides create and recall methods with full type safety
export function useRunner<T extends Runner = Runner, U extends UsableRunner<T> = UsableRunner<T>>(
  UsableRunner: U,
  initialSetup: () => T
) {
  const [currentRunner, setRunner] = useState(initialSetup);

  const status = useSyncExternalStore(currentRunner.onStatus, () => currentRunner.status);
  const logs = useSyncExternalStore(currentRunner.onLog, () => currentRunner.logs);
  const error = useSyncExternalStore(currentRunner.onError, () => currentRunner.error);

  useEffect(() => currentRunner.tearDown, [currentRunner]);

  const create = useCallback(
    (args: any) => {
      const newRunner = UsableRunner.Create(args);
      setRunner(newRunner);
      return newRunner;
    },
    [UsableRunner]
  );

  const recall = useCallback(
    async (args: any) => {
      const recalledRunner = await UsableRunner.Recall(args);
      setRunner(recalledRunner);
      return recalledRunner;
    },
    [UsableRunner]
  );

  return {
    runner: currentRunner,
    logs,
    isPending: status === "pending",
    isCompleted: status === "success" || status === "error",
    isIdle: status === "idle",
    isFailed: status === "error",
    status,
    create,
    recall,
  };
}
