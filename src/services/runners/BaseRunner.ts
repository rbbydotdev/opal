import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { Runner } from "@/types/RunnerInterfaces";
import { RunnerLogLine, RunnerLogType, createLogLine } from "@/types/RunnerTypes";

export abstract class BaseRunner<T extends BaseRunner<T> = any> implements Runner<T> {
  protected _logs: RunnerLogLine[] = [];
  protected _completed: boolean = false;
  protected _running: boolean = false;
  protected _error: string | null = null;
  protected abortController: AbortController = new AbortController();

  emitter = CreateSuperTypedEmitter<{
    log: RunnerLogLine;
    complete: boolean;
    running: boolean;
    update: T;
  }>();

  // Runner interface implementation
  get logs(): RunnerLogLine[] {
    return this._logs;
  }

  get completed(): boolean {
    return this._completed;
  }

  get running(): boolean {
    return this._running;
  }

  get error(): string | null {
    return this._error;
  }

  // Note: Subclasses should implement static Create and Recall methods
  // TypeScript doesn't support abstract static methods, so we document this as a convention

  // Common reactive methods
  onLog = (callback: (log: RunnerLogLine) => void) => {
    return this.emitter.on("log", callback);
  };

  onComplete = (callback: (complete: boolean) => void) => {
    return this.emitter.on("complete", callback);
  };

  onRunning = (callback: (running: boolean) => void) => {
    return this.emitter.on("running", callback);
  };

  onUpdate = (callback: (runner: T) => void) => {
    return this.emitter.on("update", callback);
  };

  getRunner = (): T => this as unknown as T;

  tearDown() {
    this.emitter.clearListeners();
  }

  cancel() {
    this.abortController.abort();
    this.log("Operation cancelled by user", "error");
  }

  // Common logging functionality
  protected log = (message: string, type?: RunnerLogType) => {
    const line = createLogLine(message, type);
    this._logs = [...this._logs, line];
    this.emitter.emit("log", line);
    this.emitter.emit("update", this as T);
    return line;
  };

  // Protected helpers for subclasses
  protected setRunning(running: boolean) {
    this._running = running;
    this.emitter.emit("running", running);
    this.emitter.emit("update", this as T);
  }

  protected setCompleted(completed: boolean) {
    this._completed = completed;
    this.emitter.emit("complete", completed);
    this.emitter.emit("update", this as T);
  }

  protected setError(error: string | null) {
    this._error = error;
    this.emitter.emit("update", this as T);
  }

  protected clearError() {
    this._error = null;
    this.emitter.emit("update", this as T);
  }

  // Abstract method that subclasses must implement
  abstract execute(options?: Record<string, unknown>): Promise<unknown>;
}
