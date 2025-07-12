declare const self: ServiceWorkerGlobalScope;
import { RemoteLogger } from "@/lib/RemoteLogger";
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";

// --- Constants ---
export const WHITELIST = ["/opal.svg", "/opal-blank.svg", "/favicon.ico", "/icon.svg", "/opal-lite.svg"];

// --- Logging Setup ---
function formatConsoleMsg(msg: unknown): string {
  if (msg instanceof Error) {
    return `${msg.name}: ${msg.message}\n${msg.stack ?? ""}`;
  }
  if (typeof msg === "object") {
    try {
      return JSON.stringify(msg, null, 2);
    } catch {
      return String(msg);
    }
  }
  return String(msg);
}

const RL = RemoteLogger("ServiceWorker");
console.log = (msg: unknown) => RL(formatConsoleMsg(msg), "log");
console.debug = (msg: unknown) => RL(formatConsoleMsg(msg), "debug");
console.error = (msg: unknown) => RL(formatConsoleMsg(msg), "error");
console.warn = (msg: unknown) => RL(formatConsoleMsg(msg), "warn");

// --- Request Signaling ---
export function signalRequest(detail: RequestEventDetail) {
  void self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(detail);
    });
  });
}

export function withRequestSignal<T extends (...args: never[]) => Promise<Response>>(handler: T) {
  return async function (...args: Parameters<T>): Promise<Response> {
    signalRequest({ type: REQ_SIGNAL.START });
    try {
      return await handler(...args);
    } finally {
      signalRequest({ type: REQ_SIGNAL.END });
    }
  };
}
