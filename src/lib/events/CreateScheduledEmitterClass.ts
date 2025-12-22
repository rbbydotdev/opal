import { EventEmitter } from "events";
import {
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_LowPriority,
  unstable_NormalPriority,
  unstable_runWithPriority,
  unstable_scheduleCallback,
  unstable_UserBlockingPriority,
} from "scheduler";

type SchedulerPriorityKey = "immediate" | "user-blocking" | "normal" | "low" | "idle" | "$"; // "$" means "use default priority"

const priorityMap = {
  immediate: unstable_ImmediatePriority,
  "user-blocking": unstable_UserBlockingPriority,
  normal: unstable_NormalPriority,
  low: unstable_LowPriority,
  idle: unstable_IdlePriority,
} as const;

export function CreateScheduledEmitter<Events extends Record<string, any>, Meta = {}>(options?: {
  defaultPriority?: Exclude<SchedulerPriorityKey, "$">;
}) {
  return new (CreateScheduledEmitterClass<Events, Meta>())(options);
}

export function CreateScheduledEmitterClass<Events extends Record<string, any>, Meta = {}>() {
  type ExtendedEvents = Events & {
    "*": Events[keyof Events] & Meta & { eventName: keyof Events };
  };

  return class {
    private emitter = new EventEmitter();
    private defaultPriority: Exclude<SchedulerPriorityKey, "$">;
    private scheduled: Array<() => void> = [];

    constructor({
      defaultPriority = "normal",
    }: {
      defaultPriority?: Exclude<SchedulerPriorityKey, "$">;
    } = {}) {
      this.emitter.setMaxListeners(100);
      this.defaultPriority = defaultPriority;
    }

    // ---- Default priority management ----
    setDefaultPriority(priority: Exclude<SchedulerPriorityKey, "$">): void {
      this.defaultPriority = priority;
    }

    getDefaultPriority(): Exclude<SchedulerPriorityKey, "$"> {
      return this.defaultPriority;
    }

    // ---- Queued flush controls ----
    flushAll(): void {
      const pending = [...this.scheduled];
      this.scheduled.length = 0;
      for (const fn of pending) fn();
    }

    cancelAll(): void {
      this.scheduled.length = 0;
    }

    // ---- Subscription methods ----
    on<K extends keyof ExtendedEvents>(
      event: K | (keyof Events)[],
      listener: (payload: ExtendedEvents[K]) => void
    ): () => void {
      if (Array.isArray(event)) {
        const unsubscribers = event.map((e) => {
          this.emitter.on(e as string | symbol, listener);
          return () => this.emitter.off(e as string | symbol, listener);
        });
        return () => unsubscribers.forEach((unsub) => unsub());
      } else {
        this.emitter.on(event as string | symbol, listener);
        return () => this.emitter.off(event as string | symbol, listener);
      }
    }

    once<K extends keyof ExtendedEvents>(event: K, listener: (payload: ExtendedEvents[K]) => void): () => void {
      this.emitter.once(event as string | symbol, listener);
      return () => this.emitter.off(event as string | symbol, listener);
    }

    // ---- Priority-first emit ----
    emit<K extends keyof Events>(event: K, payload: Events[K] & Meta, priority: SchedulerPriorityKey = "$"): void {
      const resolvedPriority = priority === "$" ? this.defaultPriority : priority;
      const reactPriority = priorityMap[resolvedPriority];

      const run = () => {
        unstable_runWithPriority(reactPriority, () => {
          this.emitter.emit(event as string | symbol, payload);
          this.emitter.emit("*", { ...payload, eventName: event });
        });
      };

      unstable_scheduleCallback(reactPriority, run);
      this.scheduled.push(run);
    }

    // ---- Listener management ----
    off<K extends keyof ExtendedEvents>(event: K, listener: (payload: ExtendedEvents[K]) => void): void {
      this.emitter.off(event as string | symbol, listener);
    }

    removeListener<K extends keyof ExtendedEvents>(event: K, listener: (payload: ExtendedEvents[K]) => void): void {
      this.emitter.removeListener(event as string | symbol, listener);
    }

    clearListeners(): void {
      this.emitter.removeAllListeners();
    }

    // ---- Await utility ----
    awaitEvent<K extends keyof ExtendedEvents>(event: K): Promise<ExtendedEvents[K]> {
      return new Promise((resolve) => {
        const handler = (payload: ExtendedEvents[K]) => {
          this.emitter.off(event as string | symbol, handler);
          resolve(payload);
        };
        this.on(event, handler);
      });
    }
  };
}
