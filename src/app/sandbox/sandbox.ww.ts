import { SandboxWorkerAPI } from "@/app/sandbox/sandbox-worker-api";
import { expose } from "comlink";

export const SandboxWorker = expose(SandboxWorkerAPI);
