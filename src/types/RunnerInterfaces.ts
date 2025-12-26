import { RunnerLogLine } from "@/types/RunnerTypes";

// Base interface that all runners must implement
export interface Runner {
  tearDown(): void;
  logs: RunnerLogLine[];
  error: string | null;
  status: "idle" | "success" | "pending" | "error";
  execute(options?: Record<string, unknown>): Promise<unknown>;
  cancel?(): void;
}
