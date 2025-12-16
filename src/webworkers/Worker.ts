import { NotFoundError } from "@/lib/errors/errors";
import { MyClass } from "@/webworkers/services/ww1/worker";
import * as Comlink from "comlink";
import Ww from "./services/ww?worker";

class ComlinkWorker<T = unknown> {
  readonly worker: Worker;
  readonly comlink: Comlink.Remote<T>;

  constructor(worker: Worker) {
    this.worker = worker;
    this.comlink = Comlink.wrap(this.worker);
  }

  terminate() {
    return this.worker.terminate();
  }
}

type ConfigEntry<C> = {
  worker: () => ComlinkWorker<C>;
  size: number;
};

type ConfigType = {
  [key: string]: ConfigEntry<any>;
};

const CONFIG = {
  Worker1: {
    worker: () => new ComlinkWorker<MyClass>(new Ww()),
    size: 1,
  },
} satisfies ConfigType;

class WWorker<TConfig extends ConfigType> {
  workers: Map<keyof TConfig & string, ComlinkWorker[]> = new Map();

  constructor(private config: TConfig) {}

  get<K extends keyof TConfig>(name: K): ReturnType<TConfig[K]["worker"]>["comlink"] {
    const workerArray = this.workers.get(name as string);
    if (workerArray && workerArray.length > 0) {
      const worker = workerArray.shift()!;
      workerArray.push(worker);
      return worker.comlink as ReturnType<TConfig[K]["worker"]>["comlink"];
    } else {
      throw new NotFoundError(`Worker "${String(name)}" not found or not initialized.`);
    }
  }

  up() {
    for (const [name, config] of Object.entries(this.config)) {
      if (!this.workers.has(name)) {
        this.workers.set(name, []);
      }
      for (let i = 0; i < config.size; i++) {
        const worker = config.worker();
        this.workers.get(name)!.push(worker);
      }
    }
  }

  down() {
    for (const workerArray of this.workers.values()) {
      for (const worker of workerArray) {
        worker.terminate();
      }
    }
  }
}

let _ww: WWorker<typeof CONFIG> | null = null;

export const WWorkers = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_ww) _ww = new WWorker(CONFIG);
      return Reflect.get(_ww, prop);
    },
  }
) as WWorker<typeof CONFIG>;
