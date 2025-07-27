/* eslint-disable @typescript-eslint/no-explicit-any */
import Emittery from "emittery";

// Step 1: A utility type to find the keys of T that are functions
// returning a Promise.
type PromiseReturningFunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<any> ? K : never;
}[keyof T];

// Step 2: A utility type to create the event map for Emittery.
// For each promise-returning function key 'F', it creates two event
// signatures: 'F:start' and 'F:end', both with an undefined payload.
type WatcherEvents<T> = {
  [K in PromiseReturningFunctionKeys<T> as
    | `${K & string}:start`
    | `${K & string}:end`
    | "*"
    | "*:start"
    | "*:end"]: undefined;
};

/**
 * Wraps an object instance and emits 'start' and 'end' events for any
 * method that returns a Promise.
 *
 * @example
 * const service = new MyApiService();
 * const watcher = new WatchPromiseMembers(service);
 *
 * // Type-safe: TypeScript knows `fetchData` is a valid event root.
 * watcher.events.on('fetchData:start', () => console.log('Starting...'));
 * watcher.events.on('fetchData:end', () => console.log('Finished!'));
 *
 * // This would cause a TypeScript error:
 * // watcher.events.on('someOtherMethod:start', () => {});
 *
 * // Call the method on the watched instance
 * await watcher.watched.fetchData();
 */
export class WatchPromiseMembers<T extends object> {
  /**
   * The type-safe event emitter. You can subscribe to events from this property.
   * e.g., `watcher.events.on('methodName:start', () => {})`
   */
  public readonly events: Emittery<WatcherEvents<T>>;

  /**
   * The proxied instance. You should call the methods on this property
   * to trigger the events.
   */
  public readonly watched: T;

  constructor(instance: T) {
    this.events = new Emittery<WatcherEvents<T>>();

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
              const eventName = prop as keyof WatcherEvents<T>;

              void this.events.emit("*" as any);
              void this.events.emit("*:start" as any);
              // We can cast here because our types ensure `prop` will
              // be a valid key if the function returns a promise.
              void this.events.emit(`${String(eventName)}:start` as any);

              return result.finally(() => {
                void this.events.emit(`${String(eventName)}:end` as any);
                void this.events.emit("*:end" as any);
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
