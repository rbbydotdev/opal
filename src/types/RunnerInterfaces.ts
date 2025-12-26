import { LogLine } from "@/types/RunnerTypes";

// Base interface that all runners must implement
export interface Runner {
  get logs(): LogLine[];
  get error(): string | null;
  get status(): "idle" | "success" | "pending" | "error";
  onStatus: (callback: () => void) => () => void;
  onLog: (callback: (logs: LogLine[]) => void) => () => void;
  onError: (callback: (error: string | null) => void) => () => void;
  tearDown(): void;
  execute(options?: Record<string, unknown>): Promise<unknown>;
}
