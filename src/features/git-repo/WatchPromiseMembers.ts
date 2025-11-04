/* eslint-disable @typescript-eslint/no-explicit-any */
import { SuperEmitter } from "@/lib/TypeEmitter";

type PromiseReturningFunctionKeys<T> = Extract<
  {
    [K in keyof T]: T[K] extends (...args: any[]) => Promise<any> ? K : never;
  }[keyof T],
  string
>;

type EventKeys<K extends string> = `${K}:start` | `${K}:end` | "*" | "*:start" | "*:end";

type WatcherEvents<T> = {
  [K in PromiseReturningFunctionKeys<T> as EventKeys<K>]: K;
};

export class WatchPromiseMembers<T extends Record<string, unknown>> {
  public readonly events: SuperEmitter<WatcherEvents<T>>;

  public readonly watched: T;

  constructor(instance: T) {
    this.events = new SuperEmitter<WatcherEvents<T>>();

    // Step 3: Create the Proxy, which is the core of the logic.
    this.watched = new Proxy(instance, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);

        // We only care about intercepting functions
        if (typeof value === "function") {
          // Return a new function that wraps the original
          return (...args: unknown[]) => {
            const result = value.apply(target, args);

            // Check if the result is a Promise (i.e., "thenable")
            if (result && typeof result.then === "function") {
              const eventName = prop.toString() as keyof WatcherEvents<T>;
              const payload = prop.toString();

              void this.events.emit("*" as any, eventName as WatcherEvents<T>[typeof eventName]);
              void this.events.emit("*:start" as any, `${payload}:start` as WatcherEvents<T>[typeof eventName]);
              // We can cast here because our types ensure `prop` will
              // be a valid key if the function returns a promise.
              void this.events.emit(
                `${String(payload)}:start` as any,
                prop.toString() as WatcherEvents<T>[typeof eventName]
              );

              return result.finally(() => {
                void this.events.emit(
                  `${String(payload)}:end` as any,
                  `${payload}:end` as WatcherEvents<T>[typeof eventName]
                );
                void this.events.emit("*:end" as any, `${payload}:end` as WatcherEvents<T>[typeof eventName]);
              });
            }

            // If it's not a promise, return the result directly
            return result;
          };
        }

        // If it's not a function, return the value directly
        return value;
      },
    });
  }
}
