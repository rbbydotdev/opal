import { SearchWorkerApi } from "@/workers/SearchWorker/SearchWorkerApi";
import * as Comlink from "comlink";
import "../transferHandlers";
Comlink.expose(SearchWorkerApi);
