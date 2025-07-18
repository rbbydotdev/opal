import { createContext, useContext, useMemo } from "react";

type PollContextType = {
  work: (pw: IPoolWorker) => Promise<unknown>;
  sighup: () => Promise<void[]>;
};

const PoolContext = createContext<PollContextType | null>(null);

interface IPoolWorker {
  ready: Promise<unknown>;
  exec: () => Promise<unknown>;
  terminate: () => void;
}

export class PoolWorker implements IPoolWorker {
  constructor(
    public exec: IPoolWorker["exec"],
    public ready: IPoolWorker["ready"],
    public terminate: IPoolWorker["terminate"]
  ) {}
}

class DelayedWorker {
  constructor(
    private poolWorker: IPoolWorker,
    private resolve: (value?: unknown) => void,
    private reject: (reason?: unknown) => void
  ) {}
  exec() {
    return this.poolWorker.exec().then(this.resolve).catch(this.reject);
  }
  get ready() {
    return this.poolWorker.ready;
  }

  terminate() {
    return this.poolWorker.terminate();
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
        pool[availIdx] = pw.ready
          .then(() => pw.exec().catch(rj).then(rs))
          .finally(() => {
            pool[availIdx] = null;
            if (queue.length) {
              console.log("popping from queue");
              void work(queue.pop()!);
            }
          });
      }
    });
  };

  return <PoolContext.Provider value={{ work, sighup }}>{children}</PoolContext.Provider>;
};
