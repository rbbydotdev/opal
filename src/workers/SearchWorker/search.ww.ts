import { WorkerApi } from "@/workers/SearchWorker/WorkerApi";
import * as Comlink from "comlink";
import "../transferHandlers";
Comlink.expose(WorkerApi);
export type SearchApiType = typeof WorkerApi;
