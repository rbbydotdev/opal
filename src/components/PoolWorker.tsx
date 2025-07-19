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
  ready: Promise<boolean>;
  exec: () => Promise<unknown>;

  promise: { promise: Promise<void>; resolve: (value?: void) => void; reject: (reason?: void) => void };
  // terminate: () => void;
  setup: () => Promise<TResource> | TResource;
  readonly resource: TResource | null;
  using: (res: TResource | null) => IPoolWorker<TResource>;

  cleanup: (re: TResource) => void; // terminate: () => void;
}

export class PoolWorker<TResource extends Resource> implements IPoolWorker<TResource> {
  resource: TResource | null = null;
  ready = Promise.resolve(true);

  promise = Promise.withResolvers<void>();

  constructor(
    private execFn: (res: TResource) => Promise<void>,
    public setup: () => Promise<TResource> | TResource, // public terminate: (re: TResource) => void // terminate: () => void;

    public cleanup: (re: TResource) => void
  ) {}

  async exec() {
    await this.using(null).ready;
    return this.execFn(this.resource!).finally(() => this.promise.resolve());
  }

  using(res: TResource | null): PoolWorker<TResource> {
    const typedRes = res;
    if (typedRes === null) {
      this.ready = Promise.resolve(this.setup()).then((newResource) => {
        newResource.id = id++;
        console.log("made new resource");
        this.resource = newResource;
        return true;
      });
    } else {
      this.resource = typedRes;
    }
    return this;
  }
}
let id = 0;

class DelayedWorker<TResource extends Resource> implements IPoolWorker<TResource> {
  ready = Promise.resolve(true);
  resource: TResource | null = null;
  promise = Promise.withResolvers<void>();

  constructor(
    private poolWorker: IPoolWorker<TResource>,
    private resolve: (value?: unknown) => void,
    private reject: (reason?: unknown) => void
  ) {}

  async exec() {
    return this.poolWorker.exec().then(this.resolve).catch(this.reject);
  }
  setup = this.poolWorker.setup;
  cleanup = this.poolWorker.cleanup;
  using = this.poolWorker.using;
}

// New Business Logic Class & Context Factory
// =================================================================

/**
 * Encapsulates the core pooling and queueing logic, independent of React.
 */
class PoolManager<TResource extends Resource> {
  private readonly pool: (IPoolWorker<TResource> | null)[];
  private readonly queue: IPoolWorker<TResource>[] = [];
  private readonly resources: TResource[] = [];

  constructor(max: number) {
    this.pool = new Array(max).fill(null);
  }

  /**
   * Clears the pending work queue and returns a promise that resolves
   * when all currently active workers have completed.
   */
  sighup = (): Promise<void[]> => {
    while (this.queue.length) this.queue.pop();
    const runningJobs = this.pool
      .filter((p): p is IPoolWorker<TResource> => p !== null)
      .map((pw) => pw.promise.promise);
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
        this.pool[availIdx] = poolWorker;
        void poolWorker
          .exec()
          .catch(reject)
          .then(resolve)
          .finally(() => {
            console.log("finish looking at queue ->", this.queue.length);
            const resource = poolWorker.resource;
            // console.log("pool worker finished, now have resource ->", resource);
            this.pool[availIdx] = null; // Free up the slot

            // console.log(this.queue, this.pool);
            if (this.queue.length > 0) {
              console.log("popping from queue passing resource:", resource);
              // void nextWorker.ready.then(() => this.work(nextWorker));
              return this.work(this.queue.pop()!.using(resource));
            } else {
              console.log("idle worker, cleaning up resources");
              this.pool.forEach((pw) => pw?.resource?.terminate());
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
