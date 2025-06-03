"use client";
import { REQ_NAME, REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";

// Strongly-typed CustomEvent for request signals
class RequestEvent extends CustomEvent<RequestEventDetail> {
  constructor(detail: RequestEventDetail) {
    super(REQ_NAME, { detail });
  }
}

export class RequestSignals {
  RequestEventBus = new EventTarget();
  count = 0;

  Start = () => {
    this.RequestEventBus.dispatchEvent(new RequestEvent({ type: REQ_SIGNAL.START }));
  };

  End = () => {
    this.RequestEventBus.dispatchEvent(new RequestEvent({ type: REQ_SIGNAL.END }));
  };

  Count = (count: number) => {
    this.RequestEventBus.dispatchEvent(new RequestEvent({ type: REQ_SIGNAL.COUNT, count }));
  };

  constructor() {}

  init() {
    const unsubs = [this.initListeners(), this.initSW()];
    return () => unsubs.forEach((unsub) => unsub());
  }
  initAndWatch(cb: (count: number) => void) {
    const unsubs = [this.initListeners(), this.initSW(), this.onRequest(cb)];
    return () => unsubs.forEach((unsub) => unsub());
  }

  onRequest = (cb: (count: number) => void) => {
    const handler = (event: Event) => {
      const detail = (event as RequestEvent).detail;
      if (detail.type === REQ_SIGNAL.COUNT) {
        cb(detail.count);
      }
    };
    this.RequestEventBus.addEventListener(REQ_NAME, handler);
    return () => this.RequestEventBus.removeEventListener(REQ_NAME, handler);
  };

  private initListeners() {
    const handler = (event: Event) => {
      const detail = (event as RequestEvent).detail;
      if (detail.type === REQ_SIGNAL.START) {
        this.Count(++this.count);
      } else if (detail.type === REQ_SIGNAL.END) {
        this.Count(--this.count);
      }
    };
    this.RequestEventBus.addEventListener(REQ_NAME, handler);
    return () => {
      this.RequestEventBus.removeEventListener(REQ_NAME, handler);
    };
  }

  private initSW() {
    const handler = (event: MessageEvent<RequestEventDetail>) => {
      // Type-safe: event.data is RequestEventDetail
      this.RequestEventBus.dispatchEvent(new RequestEvent(event.data));
    };
    if ("serviceWorker" in navigator) {
      // Handler for messages from the Service Worker

      function addHandlerIfControlled() {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener("message", handler as EventListener);
        }
      }

      void navigator.serviceWorker.ready.then(addHandlerIfControlled);
      navigator.serviceWorker.addEventListener("controllerchange", addHandlerIfControlled);
    }
    return () => navigator.serviceWorker.removeEventListener("message", handler as EventListener);
  }

  // Wraps an instance so that all its methods are automatically signaled
  wrapInstance<T extends object>(instance: T): T {
    return new Proxy(instance, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return (...args: unknown[]) => {
            this.Start();
            try {
              const result = value.apply(target, args);
              if (result && typeof result.then === "function") {
                return result.finally(() => this.End());
              }
              return result;
            } finally {
              this.End();
            }
          };
        }
        return value;
      },
    });
  }
}
