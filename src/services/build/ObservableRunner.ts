import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { Observable, observeMultiple } from "@/lib/Observable";
import { LogLine } from "@/types/RunnerTypes";

export class ObservableRunner<TInner extends RunnerStates> {
  target: Observable<TInner>;

  emitter = CreateSuperTypedEmitter<RunnerStates>();

  constructor(inner: TInner) {
    this.target = observeMultiple<RunnerStates>(
      inner,
      {
        logs: (newValue) => this.emitter.emit("logs", newValue),
        status: (newValue) => this.emitter.emit("status", newValue),
        error: (newValue) => this.emitter.emit("error", newValue as string),
      },
      { batch: true }
    ) as Observable<TInner>;
  }

  get status() {
    return this.target.status;
  }

  get logs() {
    return this.target.logs;
  }

  get error() {
    return this.target.error;
  }

  get isCompleted() {
    return this.status === "success" || this.status === "error";
  }

  log(message: string, type: "info" | "error" | "warning" | "success" = "info") {
    const logLine: LogLine = {
      type,
      timestamp: Date.now(),
      message,
    };

    this.target.logs = [...this.target.logs, logLine];
  }

  onLog = (callback: (logs: LogLine[]) => void): (() => void) => {
    return this.emitter.on("logs", callback);
  };

  onStatus = (callback: () => void): (() => void) => {
    return this.emitter.on("status", callback);
  };

  onError = (callback: (error: string | null) => void): (() => void) => {
    return this.emitter.on("error", callback);
  };

  tearDown = () => {
    this.emitter.clearListeners();
  };
}
type RunnerStates = {
  status: "idle" | "success" | "pending" | "error";
  logs: LogLine[];
  error: string | null;
};
