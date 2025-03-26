import * as Comlink from "comlink";

export interface WorkerApi {
  performTask: (data: unknown) => Promise<string>;
  [Comlink.releaseProxy]: () => void;
}

export const newWorkerInstance = () => {
  const workerInstance = new Worker(new URL("@/lib/ImagesWorker/ImagesWorker.ts", import.meta.url));
  const api = Comlink.wrap<WorkerApi>(workerInstance);
  return { api, worker: workerInstance };
};
