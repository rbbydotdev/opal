import { SearchWorkerApi } from "@/workers/SearchWorker/SearchWorkerApi";
import * as Comlink from "comlink";
// This function is called to ensure the transfer handlers are registered
import "@/workers/transferHandlers";

Comlink.expose(SearchWorkerApi);
