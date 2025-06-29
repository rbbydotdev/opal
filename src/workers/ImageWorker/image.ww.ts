import { ImageWorkerApi } from "@/workers/ImageWorker/ImageWorkerApi";
import * as Comlink from "comlink";
Comlink.expose(ImageWorkerApi);
