declare const self: ServiceWorkerGlobalScope;
import { RemoteLogger } from "@/lib/RemoteLogger";
// import { RemoteLogger } from "@/lib/RemoteLogger";
import { decodePath } from "@/lib/paths2";
import { REQ_SIGNAL, RequestEventDetail } from "@/lib/service-worker/request-signal-types";

// --- Constants ---

//TODO: possibly have to make this forbidden names on main, because of weird bugs
// text/javascript

interface WhiteListConfig {
  url?: string;
  mimeType?: string;
  origin?: string;
}

class WhiteListItem {
  private urlRegex: RegExp | null = null;
  private mimeTypeRegex: RegExp | null = null;
  private originRegex: RegExp | null = null;

  constructor(config: string | WhiteListConfig) {
    if (typeof config === "string") {
      this.urlRegex = new RegExp(`^${config}$`);
    } else {
      if (config.url) {
        this.urlRegex = new RegExp(`^${config.url}$`);
      }
      if (config.mimeType) {
        this.mimeTypeRegex = new RegExp(config.mimeType);
      }
      if (config.origin) {
        this.originRegex = new RegExp(config.origin);
      }
    }
  }

  test(url: URL, request: Request): boolean {
    const decodedPathname = decodePath(url.pathname);

    // URL must match if specified
    if (this.urlRegex && !this.urlRegex.test(decodedPathname)) {
      return false;
    }

    // Origin must match if specified
    if (this.originRegex && !this.originRegex.test(url.origin)) {
      return false;
    }

    // MimeType check if specified
    if (this.mimeTypeRegex) {
      const extension = decodedPathname.split(".").pop();
      let mimeType = "";

      switch (extension) {
        case "js":
          mimeType = "text/javascript";
          break;
        case "ts":
          mimeType = "text/typescript";
          break;
        case "css":
          mimeType = "text/css";
          break;
        case "json":
          mimeType = "application/json";
          break;
        case "svg":
          mimeType = "image/svg+xml";
          break;
        case "png":
          mimeType = "image/png";
          break;
        case "jpg":
        case "jpeg":
          mimeType = "image/jpeg";
          break;
        default:
          mimeType = "text/plain";
          break;
      }

      if (!this.mimeTypeRegex.test(mimeType)) {
        return false;
      }
    }

    return true;
  }
}

export const WHITELIST = [
  // "/favicon.ico",
  // "/icon.svg",
  "/opal.svg",
  "/opal-blank.svg",
  "/opal-lite.svg",
  "@/static/.*",
  {
    url: "/node_modules/.*",
    origin: "https?://localhost(:\\d+)?",
  },
  {
    url: "/src/.*",
    origin: "https?://localhost(:\\d+)?",
    mimeType: "text/javascript",
  },
].map((config) => new WhiteListItem(config));

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
