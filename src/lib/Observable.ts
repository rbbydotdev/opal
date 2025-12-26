/**
 * Observable utility for watching property changes using Proxy
 */

export type PropertyChangeCallback<T, K extends keyof T> = (
  newValue: T[K],
  oldValue: T[K],
  property: K,
  target: T
) => void;

/**
 * Helper to create a batched callback function using queueMicrotask
 */
function createBatchedCallback<T, K extends keyof T>(
  onChange: PropertyChangeCallback<T, K>,
  property: K,
  obj: T
): (newValue: any, oldValue: any) => void {
  let isBatching = false;
  let pendingChange: { newValue: any; oldValue: any } | null = null;

  return (newValue: any, oldValue: any) => {
    // Store the latest change
    pendingChange = { newValue, oldValue };

    if (!isBatching) {
      isBatching = true;
      queueMicrotask(() => {
        isBatching = false;
        if (pendingChange) {
          const { newValue: finalNewValue, oldValue: originalOldValue } = pendingChange;
          pendingChange = null;
          onChange(finalNewValue, originalOldValue, property, obj);
        }
      });
    }
  };
}

/**
 * Helper to create immediate callback function
 */
function createImmediateCallback<T, K extends keyof T>(
  onChange: PropertyChangeCallback<T, K>,
  property: K,
  obj: T
): (newValue: any, oldValue: any) => void {
  return (newValue: any, oldValue: any) => {
    onChange(newValue, oldValue, property, obj);
  };
}

export type ObservableConfig<T, K extends keyof T> = {
  target: T;
  property: K;
  onChange: PropertyChangeCallback<T, K>;
  options?: {
    batch?: boolean;
  };
};

/**
 * Creates a Proxy-wrapped object that observes changes to a specific property
 * and calls the provided callback when that property is modified.
 */
export function Observable<T extends Record<string | number | symbol, any>, K extends keyof T>(
  config: ObservableConfig<T, K>
): T {
  const { target, property, onChange, options } = config;
  const shouldBatch = options?.batch ?? false;

  const obj = new Proxy(target as any, {
    set(target: T, prop: string | symbol, newValue: any): boolean {
      if (prop === property) {
        const oldValue = (target as any)[prop];

        // Only trigger callback if the value actually changed
        if (oldValue !== newValue) {
          // Set the new value first
          (target as any)[prop] = newValue;

          // Create callback function based on batching preference
          const triggerCallback = shouldBatch
            ? createBatchedCallback(onChange, property, obj)
            : createImmediateCallback(onChange, property, obj);

          triggerCallback(newValue, oldValue);

          return true;
        }
      }

      // For all other properties, or when value didn't change, just set normally
      (target as any)[prop] = newValue;
      return true;
    },

    get(target: T, prop: string | symbol): any {
      return (target as any)[prop];
    }
  }) as T;

  return obj;
}

/**
 * Type helper for creating an Observable with TypeScript inference
 * Usage: Observable<DeployDAO, "status">({ target: deploy, property: "status", onChange: ... })
 */
export type ObservableType<T, K extends keyof T> = T & {
  readonly __observable: { property: K; target: T };
};

/**
 * Convenience function for creating an observable with a simplified API
 */
export function observe<T extends Record<string | number | symbol, any>, K extends keyof T>(
  target: T,
  property: K,
  onChange: PropertyChangeCallback<T, K>,
  options?: { batch?: boolean }
): T {
  return Observable({ target, property, onChange, options });
}

/**
 * Multiple property observer - watches multiple properties on the same object
 */
export function observeMultiple<T extends Record<string | number | symbol, any>>(
  target: T,
  observers: Partial<{
    [K in keyof T]: PropertyChangeCallback<T, K>;
  }>,
  options?: { batch?: boolean }
): T {
  const shouldBatch = options?.batch ?? false;

  // Pre-create callback functions for each property
  const callbackFunctions = new Map<keyof T, (newValue: any, oldValue: any) => void>();

  const obj = new Proxy(target as any, {
    set(target: T, prop: string | symbol, newValue: any): boolean {
      const callback = observers[prop as keyof T];

      if (callback && prop in obj) {
        const oldValue = (target as any)[prop];

        // Only trigger callback if the value actually changed
        if (oldValue !== newValue) {
          // Set the new value first
          (target as any)[prop] = newValue;

          // Get or create the callback function for this property
          let callbackFunction = callbackFunctions.get(prop as keyof T);
          if (!callbackFunction) {
            callbackFunction = shouldBatch
              ? createBatchedCallback(callback, prop as keyof T, obj)
              : createImmediateCallback(callback, prop as keyof T, obj);
            callbackFunctions.set(prop as keyof T, callbackFunction);
          }

          callbackFunction(newValue, oldValue);

          return true;
        }
      }

      // For all other properties, or when value didn't change, just set normally
      (target as any)[prop] = newValue;
      return true;
    },

    get(target: T, prop: string | symbol): any {
      return (target as any)[prop];
    }
  }) as T;

  return obj;
}