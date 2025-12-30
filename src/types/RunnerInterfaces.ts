import { LogLine } from "@/types/RunnerTypes";
import { proxy } from "valtio";

export interface RunnerForModal<T> {
  Create: (args: any) => T;
  Show: (args: any) => T;
  Recall: (args: any) => Promise<T>;
}

// Base runner state type that will be proxied by Valtio
export type RunnerState = {
  status: "idle" | "success" | "pending" | "error";
  logs: LogLine[];
  error: string | null;
};

// Base interface that all runners must implement
export interface Runner {
  target: ReturnType<typeof proxy<RunnerState>>;
  get logs(): LogLine[];
  get error(): string | null;
  get status(): "idle" | "success" | "pending" | "error";
  cancel(): void;
  onStatus: (callback: () => void) => () => void;
  onLog: (callback: (logs: LogLine[]) => void) => () => void;
  onError: (callback: (error: string | null) => void) => () => void;
  tearDown(): void;
  run(options?: { abortSignal?: AbortSignal }): Promise<unknown>;
  isCompleted: boolean;
  isPending: boolean;
  isIdle: boolean;
  isFailed: boolean;
  isSuccess: boolean;
}
