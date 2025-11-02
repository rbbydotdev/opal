import * as Comlink from "comlink";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { WorkerInstance, WorkerPoolContextValue, WorkerPoolProviderProps, WorkerPoolState } from "./types";

const WorkerPoolContext = createContext<Map<string, WorkerPoolContextValue>>(new Map());

export function WorkerPoolProvider<T = any>({ id, src, count, children }: WorkerPoolProviderProps) {
  const poolRef = useRef<WorkerPoolState<T>>({
    workers: [],
    roundRobinIndex: 0,
  });
  const contextMapRef = useRef<Map<string, WorkerPoolContextValue<T>>>(new Map());

  useEffect(() => {
    const initializeWorkers = async () => {
      const workers: WorkerInstance<T>[] = [];

      for (let i = 0; i < count; i++) {
        const worker = new Worker(src, { type: "module" });
        const remote = Comlink.wrap<T>(worker);

        workers.push({
          id: `${id}-worker-${i}`,
          worker,
          remote,
          busy: false,
          queue: [],
        });
      }

      poolRef.current.workers = workers;

      const getWorker = (): WorkerInstance<T> | null => {
        const { workers } = poolRef.current;

        // Try to find a non-busy worker
        const availableWorker = workers.find((w) => !w.busy);
        if (availableWorker) {
          return availableWorker;
        }

        // All workers are busy, use round-robin selection
        const selectedWorker = workers[poolRef.current.roundRobinIndex];
        poolRef.current.roundRobinIndex = (poolRef.current.roundRobinIndex + 1) % workers.length;

        return selectedWorker || null;
      };

      const createPoolRouter = (): Comlink.Remote<T> => {
        return new Proxy(
          {} as Comlink.Remote<T>,
          {
            get(target, prop) {
              return (...args: any[]) => {
                const worker = getWorker();
                if (!worker) {
                  return Promise.reject(new Error("No workers available"));
                }

                const executeCommand = async () => {
                  worker.busy = true;
                  try {
                    const result = await (worker.remote as any)[prop](...args);
                    return result;
                  } finally {
                    worker.busy = false;
                    // Process queue if any
                    if (worker.queue.length > 0) {
                      const nextTask = worker.queue.shift();
                      nextTask?.();
                    }
                  }
                };

                if (worker.busy) {
                  return new Promise((resolve, reject) => {
                    worker.queue.push(async () => {
                      try {
                        const result = await executeCommand();
                        resolve(result);
                      } catch (error) {
                        reject(error);
                      }
                    });
                  });
                }

                return executeCommand();
              };
            },
          }
        );
      };

      const contextValue: WorkerPoolContextValue<T> = {
        cmd: createPoolRouter(),
        getWorker,
        isReady: true,
      };

      contextMapRef.current.set(id, contextValue);
    };

    void initializeWorkers();

    const workers = poolRef.current.workers;
    const contextMap = contextMapRef.current;
    return () => {
      // Cleanup workers
      workers.forEach((worker) => {
        worker.worker.terminate();
      });
      contextMap.delete(id);
    };
  }, [id, src, count]);

  const contextValue = contextMapRef.current;

  return <WorkerPoolContext.Provider value={contextValue}>{children}</WorkerPoolContext.Provider>;
}

export function useWorkerPool<T = any>(poolId: string): WorkerPoolContextValue<T> {
  const contextMap = useContext(WorkerPoolContext);
  const poolContext = contextMap.get(poolId);

  if (!poolContext) {
    throw new Error(`Worker pool "${poolId}" not found. Make sure WorkerPoolProvider is properly configured.`);
  }

  return poolContext as WorkerPoolContextValue<T>;
}
