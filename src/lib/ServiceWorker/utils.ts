declare const self: ServiceWorkerGlobalScope;
import { RemoteLogger } from "@/lib/RemoteLogger";
// import { RemoteLogger } from "@/lib/RemoteLogger";
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";

// --- Constants ---

//TODO: possibly have to make this forbidden names on main, because of weird bugs

export const WHITELIST = [
  "/preview/.*",
  "/editview/.*",
  "/assets/.*",
  "/opal.svg",
  "/opal-blank.svg",
  "/favicon.ico",
  "/icon.svg",
  "/node_modules/.*",
  "/src/.*",
  "/opal-lite.svg",
].map((path) => new RegExp(`^${path}$`));

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

export function EnableRemoteLogger() {
  const RL = RemoteLogger("ServiceWorker");

  console.log = (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "log");
  console.debug = (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "debug");
  console.error = (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "error");
  console.warn = (...msg: unknown[]) => RL(msg.map(formatConsoleMsg).join(" "), "warn");
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
