import { useSyncExternalStore, useState, useCallback } from "react";
import { useResource } from "./useResource";
import { Runner, RunnerClass } from "@/types/RunnerInterfaces";

export function useRunner<T extends Runner>(
  setup: () => T,
  deps: unknown[] = []
) {
  const runnerResource = useResource(setup, deps);
  const runner = useSyncExternalStore(runnerResource.onUpdate, runnerResource.getRunner);

  return runner;
}

// Enhanced hook that provides create and recall methods with full type safety
export function useRunnerWithActions<
  T extends Runner,
  CreateArgs extends unknown[],
  RecallArgs extends unknown[]
>(
  RunnerClass: RunnerClass<T, CreateArgs, RecallArgs>,
  initialSetup: () => T
) {
  const [currentRunner, setCurrentRunner] = useState<T>(initialSetup);
  const runner = useRunner(() => currentRunner, [currentRunner]);

  const create = useCallback((...args: CreateArgs) => {
    const newRunner = RunnerClass.Create(...args);
    setCurrentRunner(newRunner);
    return newRunner;
  }, [RunnerClass]);

  const recall = useCallback(async (...args: RecallArgs) => {
    const recalledRunner = await RunnerClass.Recall(...args);
    setCurrentRunner(recalledRunner);
    return recalledRunner;
  }, [RunnerClass]);

  return {
    runner,
    create,
    recall,
  };
}