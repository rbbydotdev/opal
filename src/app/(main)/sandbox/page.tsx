import { Button } from "@/components/ui/button";
import React, { useMemo, useState } from "react";
type PollContextType = {
  work: (pw: PoolWorker) => Promise<unknown>;
  sighup: () => Promise<void[]>;
};

const PoolContext = React.createContext<PollContextType | null>(null);

interface PoolWorker {
  ready: () => Promise<boolean>;
  exec: () => Promise<unknown>;
  terminate: () => void;
}

class DelayedWorker {
  constructor(
    private poolWorker: PoolWorker,
    private resolve: (value?: unknown) => void,
    private reject: (reason?: unknown) => void
  ) {}
  exec() {
    return this.poolWorker.exec().then(this.resolve).catch(this.reject);
  }
  ready() {
    return this.poolWorker.ready();
  }

  terminate() {
    return this.poolWorker.terminate();
  }
}

const usePoolContext = () => {
  const context = React.useContext(PoolContext);
  if (!context) {
    throw new Error("usePoolContext must be used within a PoolProvider");
  }
  return context;
};
const PoolProvider = ({ children, max }: { children: React.ReactNode; max: number }) => {
  const pool = useMemo<(Promise<void> | null)[]>(() => new Array(max).fill(null), [max]);
  const queue = useMemo<PoolWorker[]>(() => [], []);

  const sighup = () => {
    while (queue.length) queue.pop();
    return Promise.all(pool.filter(Boolean));
  };

  const work = (pw: PoolWorker) => {
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
          .ready()
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

class Worker implements PoolWorker {
  async exec() {
    console.log("executing....");
    await new Promise((rs) => setTimeout(rs, 1000));
    return Date.now();
  }
  terminate() {}
  ready() {
    return Promise.resolve(true);
  }
}
function SomeComponent() {
  const { work, sighup } = usePoolContext();
  return (
    <div className="inset-0 m-12 bg-slate-100  w-96 h-96 border border-black text-4xl text-bold ">
      <Button
        size="lg"
        onClick={() => {
          void work(new Worker()).then(console.log);
        }}
      >
        click
      </Button>
      <Button onClick={sighup}>Cancel</Button>
    </div>
  );
}
export default function Page() {
  const arr = useMemo(() => [Date.now(), Date.now()], []);
  const [, render] = useState(0);
  return (
    <PoolProvider max={5}>
      <SomeComponent />
    </PoolProvider>
  );
}
