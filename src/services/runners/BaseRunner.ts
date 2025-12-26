import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { Runner } from "@/types/RunnerInterfaces";
import { RunnerLogLine, RunnerLogType, createLogLine } from "@/types/RunnerTypes";

export abstract class BaseRunner implements Runner {
  logs: RunnerLogLine[] = [];
  error: string | null = null;
  abstract get status(): "idle" | "success" | "pending" | "error";

  protected abortController: AbortController = new AbortController();

  emitter = CreateSuperTypedEmitter<{
    log: RunnerLogLine;
    status: "success" | "pending" | "error" | "idle";
  }>();

  onLog = (callback: (log: RunnerLogLine) => void) => {
    return this.emitter.on("log", callback);
  };

  onStatus = (callback: () => void) => {
    return this.emitter.on("status", callback);
  };

  tearDown = () => {
    this.emitter.clearListeners();
  };

  cancel() {
    this.abortController.abort();
    this.log("Operation cancelled by user", "error");
  }

  // Common logging functionality
  protected log = (message: string, type?: RunnerLogType) => {
    const line = createLogLine(message, type);
    this.logs = [...this.logs, line];
    this.emitter.emit("log", line);
    return line;
  };

  broadcastStatus = () => {
    this.emitter.emit("status", this.status);
  };
  broadcastLogs = () => {
    this.emitter.emit("log", this.logs.at(-1)!);
  };

  // Abstract method that subclasses must implement
  abstract execute(options?: Record<string, unknown>): Promise<unknown>;
}
