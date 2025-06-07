import { newImagesWorkerInstance, WorkerApi } from "@/components/SWImages";
import { Remote } from "comlink";

let _workerApi: {
  api: Remote<WorkerApi>;
  worker: Worker;
} | null = null;

export const ImagesWorker = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_workerApi) {
        _workerApi = newImagesWorkerInstance();
      }

      return Reflect.get(_workerApi, prop);
    },
  }
) as {
  api: Remote<WorkerApi>;
  worker: Worker;
};
