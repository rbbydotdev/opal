import { RunnerLogLine } from "@/types/RunnerTypes";

// Base interface that all runners must implement
export interface Runner<T = Runner<any>> {
  tearDown(): void;
  onUpdate: (callback: (runner: T) => void) => () => void;
  getRunner: () => T;
  logs: RunnerLogLine[];
  init?: () => void;
  completed: boolean;
  running: boolean;
  error: string | null;
  execute(options?: Record<string, unknown>): Promise<unknown>;
  cancel?(): void;
}

// Interface for static methods that runner classes must implement
export interface RunnerStatic<T extends Runner<T>, CreateArgs, RecallArgs> {
  Create(args: CreateArgs): T;
  Recall(args: RecallArgs): Promise<T>;
}

// Type helper to extract constructor types
export type RunnerClass<T extends Runner<T>, CreateArgs = unknown, RecallArgs = unknown> = RunnerStatic<
  T,
  CreateArgs,
  RecallArgs
> & {
  new (...args: ConstructorParameters<new (...a: any[]) => T>): T;
};
