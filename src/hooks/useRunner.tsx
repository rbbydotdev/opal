import { Runner, RunnerClass } from "@/types/RunnerInterfaces";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Enhanced hook that provides create and recall methods with full type safety
export function useRunner<T extends Runner<T>, CreateArgs, RecallArgs>(
  RunnerClass: RunnerClass<T, CreateArgs, RecallArgs>,
  initialSetup: () => T
) {
  const [currentRunner, setRunner] = useState<T>(initialSetup);

  const runner = useSyncExternalStore<T>(currentRunner.onUpdate, currentRunner.getRunner);

  useEffect(() => {
    currentRunner.init?.();
    return () => {
      currentRunner.tearDown();
    };
  }, [currentRunner]);

  const create = useCallback(
    (args: CreateArgs) => {
      const newRunner = RunnerClass.Create(args);
      setRunner(newRunner);
      return newRunner;
    },
    [RunnerClass]
  );

  const recall = useCallback(
    async (args: RecallArgs) => {
      const recalledRunner = await RunnerClass.Recall(args);
      setRunner(recalledRunner);
      return recalledRunner;
    },
    [RunnerClass]
  );

  return {
    runner,
    create,
    recall,
  };
}
