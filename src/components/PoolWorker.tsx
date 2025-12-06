/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Resource<T = unknown> {
  api: T;
  terminate: () => void;
}

export interface IPoolWorker<TResource extends Resource> {
  workId: string;
  exec: (res: TResource) => Promise<unknown>;
  setupResource: () => Promise<TResource> | TResource;
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

interface QueuedWork<TResource extends Resource> {
  worker: IPoolWorker<TResource>;
  promise: ReturnType<typeof Promise.withResolvers<unknown>>;
}

export class PoolManager<TResource extends Resource> {
  private readonly pool: (IPoolWorker<TResource> | null)[];
  private readonly queue: QueuedWork<TResource>[] = [];
  private readonly resourcePool: (TResource | null)[] = [];

  private startTime = 0;

  constructor(max: number) {
    this.pool = new Array(max).fill(null);
    this.resourcePool = new Array(max).fill(null);
  }

  flush = (): void => {
    while (this.resourcePool.length) this.resourcePool.pop()?.terminate();
    while (this.queue.length) this.queue.pop();
    while (this.pool.length) this.pool.pop();
  };

  work = async <TWorker extends IPoolWorker<TResource>>(poolWorker: TWorker): Promise<unknown> => {
    const availIdx = this.findAvailableSlot();

    if (availIdx === -1) {
      return this.enqueueWork(poolWorker);
    }

    return this.executeWork(poolWorker, availIdx);
  };

  private findAvailableSlot(): number {
    return this.pool.length === 0 ? 0 : this.pool.indexOf(null);
  }

  private enqueueWork<TWorker extends IPoolWorker<TResource>>(poolWorker: TWorker): Promise<unknown> {
    const promise = Promise.withResolvers<unknown>();
    this.queue.push({ worker: poolWorker, promise });
    return promise.promise;
  }

  private async executeWork<TWorker extends IPoolWorker<TResource>>(
    poolWorker: TWorker,
    slotIndex: number
  ): Promise<unknown> {
    this.pool[slotIndex] = poolWorker;

    try {
      await this.ensureResource(slotIndex, poolWorker);
      if (!this.startTime) this.startTime = Date.now();

      return await poolWorker.exec(this.resourcePool[slotIndex]!);
    } finally {
      return this.releaseSlot(slotIndex);
    }
  }

  private async ensureResource<TWorker extends IPoolWorker<TResource>>(
    slotIndex: number,
    poolWorker: TWorker
  ): Promise<void> {
    if (!this.resourcePool[slotIndex]) {
      this.resourcePool[slotIndex] = await poolWorker.setupResource();
    }
  }

  private releaseSlot(slotIndex: number) {
    this.pool[slotIndex] = null;

    if (this.queue.length > 0) {
      const queued = this.queue.shift()!;
      this.executeWork(queued.worker, slotIndex).then(queued.promise.resolve).catch(queued.promise.reject);
    } else if (this.resourcePool[slotIndex]) {
      this.resourcePool[slotIndex]!.terminate();
      this.resourcePool[slotIndex] = null;
    }
  }
}
