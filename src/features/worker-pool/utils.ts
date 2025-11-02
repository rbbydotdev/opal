import * as Comlink from 'comlink';

export function exposeWorkerAPI<T>(api: T): void {
  Comlink.expose(api);
}

export function createWorkerProxy<T>(worker: Worker): Comlink.Remote<T> {
  return Comlink.wrap<T>(worker);
}

export function terminateWorker(worker: Worker): void {
  worker.terminate();
}