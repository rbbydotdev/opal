import { createContext, useContext, useMemo } from "react";

type PoolContextType = {
  work: (pw: IPoolWorker) => Promise<unknown>;
  sighup: () => Promise<void[]>;
};

export interface Resource {
  resource: unknown;
  terminate: () => void;
}

const PoolContext = createContext<PoolContextType | null>(null);

interface IPoolWorker<TResource extends Resource = Resource> {
  // ready: Promise<unknown>;
  exec: () => Promise<unknown>;
  terminate: (re: IPoolWorker<TResource>["resource"]) => void;

  setup: () => Promise<TResource> | TResource;

  readonly resource: TResource | null;
  using: (res: TResource | null) => IPoolWorker<TResource>;
}

export class PoolWorker<TResource extends Resource> implements IPoolWorker {
  resource: TResource | null = null;

  ready = Promise.resolve(true);
  constructor(
    private execFn: (res: TResource) => Promise<void>,
    public setup: IPoolWorker<TResource>["setup"],
    public terminate: IPoolWorker["terminate"]
  ) {}
  async exec() {
    await this.ready;
    return this.execFn(this.resource ?? ((await this.setup()) as TResource));
  }
  using(res: Resource | null) {
    const typedRes = res as TResource | null;
    if (typedRes === null) {
      this.ready = Promise.resolve(this.setup()).then((res) => {
        this.resource = res as TResource;
        return true;
      });
      return this;
    } else {
      this.resource = typedRes;
      return this;
    }
  }
}

class DelayedWorker {
  ready = Promise.resolve(true);
  resource: Resource | null = null;
  constructor(
    private poolWorker: IPoolWorker,
    private resolve: (value?: unknown) => void,
    private reject: (reason?: unknown) => void
  ) {}
  async exec() {
    return this.poolWorker.exec().then(this.resolve).catch(this.reject);
  }
  setup() {
    return this.poolWorker.setup();
  }

  terminate() {
    return this.poolWorker.terminate(this.resource);
  }
  using(res: Resource | null) {
    return this.poolWorker.using(res);
  }
}

export const usePoolContext = () => {
  const context = useContext(PoolContext);
  if (!context) {
    throw new Error("usePoolContext must be used within a PoolProvider");
  }
  return context;
};
export const PoolProvider = ({ children, max }: { children: React.ReactNode; max: number }) => {
  const pool = useMemo<(Promise<void> | null)[]>(() => new Array(max).fill(null), [max]);
  const queue = useMemo<IPoolWorker[]>(() => [], []);

  const sighup = () => {
    while (queue.length) queue.pop();
    return Promise.all(pool.filter(Boolean));
  };

  const work = (pw: IPoolWorker) => {
    return new Promise((rs, rj) => {
      if (!pool) {
        throw new Error("unknown error");
      }
      const availIdx = pool.indexOf(null);

      if (availIdx === -1) {
        console.log("queue full");
        queue.push(new DelayedWorker(pw, rs, rj));
      } else {
        pool[availIdx] = pw
          .using(null)
          .exec()
          .catch(rj)
          .then(rs)
          .finally(() => {
            const resource = pw.resource;
            pool[availIdx] = null;
            if (queue.length) {
              console.log("popping from queue");
              void work(queue.pop()!.using(resource));
            }
          });
      }
    });
  };

  return <PoolContext.Provider value={{ work, sighup }}>{children}</PoolContext.Provider>;
};
