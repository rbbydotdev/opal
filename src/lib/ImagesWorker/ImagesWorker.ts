// worker.ts
import * as Comlink from "comlink";

// Define the API that the worker will expose
const workerApi = {
  async mountDisk(guid: string) {
    // Simulate some work
    const result = `Mounted: ${guid}`;
    return result;
  },
  async performTask(data: unknown) {
    // Simulate some work
    const result = `Processed: ${data}`;
    return result;
  },
};

// Expose the API via Comlink
Comlink.expose(workerApi);
