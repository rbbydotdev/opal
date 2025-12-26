import { LogLine } from "@/types/RunnerTypes";

export interface RunnerForModal<T> {
  Create: (args: any) => T;
  Show: (args: any) => T;
  Recall: (args: any) => Promise<T>;
}

// Base interface that all runners must implement
export interface Runner {
  get logs(): LogLine[];
  get error(): string | null;
  get status(): "idle" | "success" | "pending" | "error";
  cancel(): void;
  onStatus: (callback: () => void) => () => void;
  onLog: (callback: (logs: LogLine[]) => void) => () => void;
  onError: (callback: (error: string | null) => void) => () => void;
  tearDown(): void;
  execute(signal?: AbortSignal): Promise<unknown>;
  isCompleted: boolean;
  isPending: boolean;
  isIdle: boolean;
  isFailed: boolean;
  isSuccess: boolean;
}
