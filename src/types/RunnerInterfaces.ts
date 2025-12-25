import { RunnerLogLine } from "@/types/RunnerTypes";

// Base interface that all runners must implement
export interface Runner {
  tearDown(): void;
  onUpdate: (callback: (runner: Runner) => void) => () => void;
  getRunner: () => Runner;
  logs: RunnerLogLine[];
  completed: boolean;
  running: boolean;
  error: string | null;
  execute(options?: Record<string, unknown>): Promise<unknown>;
  cancel?(): void;
}

// Interface for static methods that runner classes must implement
export interface RunnerStatic<T extends Runner, CreateArgs extends unknown[], RecallArgs extends unknown[]> {
  Create(...args: CreateArgs): T;
  Recall(...args: RecallArgs): Promise<T>;
}

// Type helper to extract constructor types
export type RunnerClass<
  T extends Runner,
  CreateArgs extends unknown[] = unknown[],
  RecallArgs extends unknown[] = unknown[]
> = RunnerStatic<T, CreateArgs, RecallArgs> & {
  new (...args: unknown[]): T;
};