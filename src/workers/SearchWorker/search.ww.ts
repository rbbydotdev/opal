import { SearchWorkerApi } from "@/workers/SearchWorker/search.api";
import * as Comlink from "comlink";
// This function is called to ensure the transfer handlers are registered
import "@/workers/transferHandlers/asyncGenerator.th";

Comlink.expose(SearchWorkerApi);
