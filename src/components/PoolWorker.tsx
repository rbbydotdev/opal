/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useMemo } from "react";

// Unchanged Original Interfaces & Classes
// =================================================================

export interface Resource<T = unknown> {
  api: T;
  ready: Promise<boolean>;
  terminate: () => void;
}

export interface IPoolWorker<TResource extends Resource> {
  exec: () => Promise<unknown>;
  // terminate: () => void;
  setup: () => Promise<TResource> | TResource;
  readonly resource: TResource | null;
  using: (res: TResource | null) => IPoolWorker<TResource>;

  cleanup: (re: TResource) => void; // terminate: () => void;
}

export class PoolWorker<TResource extends Resource> implements IPoolWorker<TResource> {
  resource: TResource | null = null;
  ready = Promise.resolve(true);

  constructor(
    private execFn: (res: TResource) => Promise<void>,
    public setup: () => Promise<TResource> | TResource, // public terminate: (re: TResource) => void // terminate: () => void;

    public cleanup: (re: TResource) => void
  ) {}

  async exec() {
    await this.ready;
    return this.execFn(this.resource ?? ((await this.setup()) as TResource));
  }

  using(res: TResource | null): IPoolWorker<TResource> {
    const typedRes = res as TResource | null;
    if (typedRes === null) {
      this.ready = Promise.resolve(this.setup()).then((res) => {
        this.resource = res as TResource;
        return true;
      });
    } else {
      this.resource = typedRes;
    }
    return this;
  }
}

class DelayedWorker<TResource extends Resource> implements IPoolWorker<TResource> {
  ready = Promise.resolve(true);
  resource: TResource | null = null;

  constructor(
    private poolWorker: IPoolWorker<TResource>,
    private resolve: (value?: unknown) => void,
    private reject: (reason?: unknown) => void
  ) {}

  async exec() {
    return this.poolWorker.exec().then(this.resolve).catch(this.reject);
  }

  setup() {
    return this.poolWorker.setup();
  }

  cleanup() {
    return this.poolWorker.cleanup(this.poolWorker.resource!);
  }

  using(res: TResource | null) {
    this.poolWorker.using(res);
    return this;
  }
}

// New Business Logic Class & Context Factory
// =================================================================

/**
 * Encapsulates the core pooling and queueing logic, independent of React.
 */
class PoolManager<TResource extends Resource> {
  private readonly pool: (Promise<void> | null)[];
  private readonly queue: IPoolWorker<TResource>[] = [];

  constructor(max: number) {
    this.pool = new Array(max).fill(null);
  }

  /**
   * Clears the pending work queue and returns a promise that resolves
   * when all currently active workers have completed.
   */
  sighup = (): Promise<void[]> => {
    while (this.queue.length) this.queue.pop();
    const runningJobs = this.pool.filter((p): p is Promise<void> => p !== null);
    return Promise.all(runningJobs);
  };

  /**
   * Accepts a worker, runs it if a slot is available, or queues it if not.
   * Manages resource creation and reuse between sequential jobs.
   * @param poolWorker The worker to execute.
   * @returns A promise that resolves or rejects when the worker completes.
   */
  work = <TWorker extends IPoolWorker<TResource>>(poolWorker: TWorker): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const availIdx = this.pool.indexOf(null);

      if (availIdx === -1) {
        console.log("queue full");
        this.queue.push(new DelayedWorker(poolWorker, resolve, reject));
      } else {
        this.pool[availIdx] = poolWorker
          .exec()
          .catch(reject)
          .then(resolve)
          .finally(() => {
            const resource = poolWorker.resource;
            this.pool[availIdx] = null; // Free up the slot

            if (this.queue.length > 0) {
              console.log("popping from queue", "queue length:", this.queue.length);
              const nextWorker = this.queue.pop()!;
              // Reuse the resource for the next worker in the queue
              // Schedule the next worker. The returned promise is intentionally
              // ignored, as the original promise for that worker is resolved
              // by the DelayedWorker's internal resolve/reject handlers.
              nextWorker.using(resource);
              void this.work(nextWorker);
            } else {
              console.log("idle worker, cleaning up resource");
              // pw.terminate(resource!); // Clean up the resource
              resource?.terminate();
            }
          });
      }
    });
  };
}

/**
 * The type definition for the context value, generic over the worker type.
 */
type PoolContextValue<TWorker extends IPoolWorker<Resource<any>>> = {
  work: (pw: TWorker) => Promise<any>;
  sighup: () => Promise<void[]>;
};

/**
 * Creates a strongly-typed React Context, Provider, and consumer Hook
 * for a specific type of IPoolWorker.
 */
export function CreatePoolContext<TWorker extends IPoolWorker<Resource<any>>>() {
  const Context = createContext<PoolContextValue<TWorker> | null>(null);
  Context.displayName = "PoolContext";

  const PoolProvider = ({ children, max }: { children: React.ReactNode; max: number }) => {
    const manager = useMemo(() => new PoolManager(max), [max]);

    // The manager's generic `work` method is compatible with the
    // more specific `work` signature required by the context value.
    const contextValue: PoolContextValue<TWorker> = {
      work: manager.work,
      sighup: manager.sighup,
    };

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  };

  const usePool = () => {
    const context = useContext(Context);
    if (!context) {
      throw new Error("usePool must be used within its corresponding PoolProvider");
    }
    return context;
  };

  return { PoolProvider, usePool, Context };
}
