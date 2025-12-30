import { RunnerState } from "@/types/RunnerInterfaces";
import { LogLine } from "@/types/RunnerTypes";
import { proxy } from "valtio";

export class ObservableRunner<TInner extends RunnerState> {
  target: ReturnType<typeof proxy<TInner>>;

  constructor(inner: TInner) {
    this.target = proxy(inner);
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

  // No longer need these methods - Valtio handles subscriptions automatically
  onLog = (): (() => void) => {
    return () => {};
  };

  onStatus = (): (() => void) => {
    return () => {};
  };

  onError = (): (() => void) => {
    return () => {};
  };

  tearDown = () => {
    // No cleanup needed with Valtio
  };
}

// RunnerState is now imported from RunnerInterfaces
