import { useSyncExternalStore, useState, useEffect, useCallback } from "react";
import { RunnerLogLine } from "@/types/RunnerTypes";

export interface Runner {
  tearDown(): void;
  onUpdate: (callback: (runner: any) => void) => () => void;
  getRunner: () => any;
  logs: RunnerLogLine[];
  completed: boolean;
  running: boolean;
  error: string | null;
  execute(options?: any): Promise<any>;
  cancel?(): void;
}

export function useRunner<T extends Runner>(initialSetup: () => T) {
  const [runner, setRunner] = useState<T>(initialSetup);

  // Teardown when runner changes
  useEffect(() => {
    return () => runner.tearDown();
  }, [runner]);

  // Reactive subscriptions
  const logs = useSyncExternalStore(runner.onUpdate, () => runner.logs);
  const completed = useSyncExternalStore(runner.onUpdate, () => runner.completed);
  const running = useSyncExternalStore(runner.onUpdate, () => runner.running);
  const error = useSyncExternalStore(runner.onUpdate, () => runner.error);

  const replaceRunner = useCallback((newSetup: () => T) => {
    setRunner(newSetup());
  }, []);

  return {
    runner,
    logs,
    completed,
    running,
    error,
    replaceRunner,
  };
}