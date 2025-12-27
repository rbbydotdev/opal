declare const self: ServiceWorkerGlobalScope;
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/service-worker/request-signal-types";

import { LogTransport, RemoteLogger } from "@/lib/RemoteLogger";

// --- Logging Setup ---
function formatConsoleMsg(msg: unknown): string {
  if (msg instanceof Error) {
    return `${msg.name}: ${msg.message}\n${msg.stack ?? ""}`;
  }
  if (typeof msg === "object") {
    try {
      return JSON.stringify(msg, null, 2);
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(msg);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(msg);
}
export function RemoteLoggerLogger(name: string = "", transport: LogTransport = "postMsg") {
  const RL = RemoteLogger(name, transport);
  return {
    log: (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "log"),
    debug: (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "debug"),
    error: (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "error"),
    warn: (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "warn"),
  };
}

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
