/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useMemo } from "react";

// Unchanged Original Interfaces & Classes
// =================================================================

export interface Resource<T = unknown> {
  api: T;
  // ready: Promise<boolean>;
  terminate: () => void;
}

export interface IPoolWorker<TResource extends Resource> {
  workId: string;
  exec: (res: TResource) => Promise<unknown>;

  setupResource: () => Promise<TResource> | TResource;

  // cleanup: (re: TResource) => void; // terminate: () => void;

  $p: ReturnType<typeof Promise.withResolvers<void>>;
}

export class PoolWorker<TResource extends Resource> implements IPoolWorker<TResource> {
  public readonly $p = Promise.withResolvers<void>();
  constructor(
    private execFn: (res: TResource) => Promise<void>,
    public setupResource: () => Promise<TResource> | TResource, // public terminate: (re: TResource) => void // terminate: () => void; // public cleanup: (re: TResource) => void
    public workId: string = crypto.randomUUID()
  ) {}

  async exec(res: TResource) {
    const result = await this.execFn(res);
    this.$p.resolve(result);
    return result;
  }
}

class DelayedWorker<TResource extends Resource> implements IPoolWorker<TResource> {
  constructor(
    private poolWorker: IPoolWorker<TResource>,
    private resolve: (value?: unknown) => void,
    private reject: (reason?: unknown) => void
  ) {}

  get $p() {
    return this.poolWorker.$p;
  }
  get workId() {
    return this.poolWorker.workId;
  }
  async exec(res: TResource) {
    return this.poolWorker.exec(res).then(this.resolve).catch(this.reject);
  }
  get setupResource() {
    return this.poolWorker.setupResource;
  }
  // get cleanup() {
  //   return this.poolWorker.cleanup;
  // }
}

// New Business Logic Class & Context Factory
// =================================================================

/**
 * Encapsulates the core pooling and queueing logic, independent of React.
 */
class PoolManager<TResource extends Resource> {
  private readonly pool: (IPoolWorker<TResource> | null)[];
  private readonly queue: IPoolWorker<TResource>[] = [];
  private readonly resourcePool: (TResource | null)[] = [];

  private startTime = 0;

  constructor(max: number) {
    this.pool = new Array(max).fill(null);
    this.resourcePool = new Array(max).fill(null);
  }

  findWorker = (id: string) => {
    // Search in the active pool
    return (
      this.pool.find((worker) => worker?.workId === id) || this.queue.find((worker) => worker.workId === id) || null
    );
  };

  flush = (): void => {
    // console.log("Terminating pool manager and cleaning up resources");
    while (this.resourcePool.length) this.resourcePool.pop()?.terminate();
    while (this.queue.length) this.queue.pop();
    while (this.pool.length) this.pool.pop();
  };

  work = <TWorker extends IPoolWorker<TResource>>(poolWorker: TWorker): Promise<unknown> => {
    return new Promise(async (resolve, reject) => {
      const availIdx = !this.pool.length ? 0 : this.pool.indexOf(null);
      if (availIdx === -1) {
        //pool slot not available
        // console.log(this.pool.length, "slots full, queuing work");
        this.queue.push(new DelayedWorker(poolWorker, resolve, reject));
      } else {
        //pool slot available
        //immediately mark the slot as occupied
        this.pool[availIdx] = poolWorker;
        if (!this.resourcePool[availIdx]) {
          // console.log(poolWorker, poolWorker.setupResource);
          this.resourcePool[availIdx] = await poolWorker.setupResource();
        }
        try {
          if (!this.startTime) this.startTime = Date.now();
          const result = await poolWorker.exec(this.resourcePool[availIdx]!);
          // console.log((Date.now() - this.startTime) / 1000, "seconds");
          return resolve(result);
          // return poolWorker.exec(this.resourcePool[availIdx]!).then((result) => resolve(result));
          // return resolve(poolWorker.exec(this.resourcePool[availIdx]!));
        } catch (e) {
          return reject(e);
        } finally {
          this.pool[availIdx] = null; // Free up the slot
          if (this.queue.length > 0) {
            return this.work(this.queue.shift()!);
          } else {
            this.resourcePool[availIdx].terminate();
            this.resourcePool[availIdx] = null;
          }
        }
      }
    });
  };
}

/**
 * The type definition for the context value, generic over the worker type.
 */
type PoolContextValue<TWorker extends IPoolWorker<Resource<any>>> = {
  work: (pw: TWorker) => Promise<any>;
  flush: () => void;
  findWorker: (id: string) => TWorker | null;
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
      flush: manager.flush,
      // findWorker: manager.findWorker as (id: string) => TWorker | null,
      findWorker: manager.findWorker as (id: string) => TWorker | null,
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
