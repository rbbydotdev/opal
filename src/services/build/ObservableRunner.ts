import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { Observable, observeMultiple } from "@/lib/Observable";
import { RunnerState } from "@/types/RunnerInterfaces";
import { LogLine } from "@/types/RunnerTypes";

export class ObservableRunner<TInner extends RunnerState> {
  target: Observable<TInner>;

  emitter = CreateSuperTypedEmitter<TInner>();

  constructor(inner: TInner) {
    const listeners = Object.entries(inner).map(([key]) => [
      key,
      this.emitter.emit.bind(this.emitter, key as keyof TInner),
    ]);

    this.target = observeMultiple<RunnerState>(inner, Object.fromEntries(listeners), {
      batch: true,
    }) as Observable<TInner>;
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
  get isPending() {
    return this.status === "pending";
  }
  get isIdle() {
    return this.status === "idle";
  }
  get isFailed() {
    return this.status === "error";
  }
  get isSuccess() {
    return this.status === "success";
  }

  log(message: string, type: "info" | "error" | "warning" | "success" = "info") {
    const logLine: LogLine = {
      type,
      timestamp: Date.now(),
      message,
    };

    this.target.logs = [...this.target.logs, logLine];
  }

  onUpdate = (callback: () => void): (() => void) => {
    return this.emitter.on("*", callback);
  };
  getUpdate = () => {
    return this.target;
  };

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
