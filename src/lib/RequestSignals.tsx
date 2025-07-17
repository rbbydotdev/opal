import { REQ_NAME, REQ_SIGNAL, RequestEventDetail } from "@/lib/ServiceWorker/request-signal-types";
import { useEffect, useRef, useState } from "react";

// Strongly-typed CustomEvent for request signals
class RequestEvent extends CustomEvent<RequestEventDetail> {
  constructor(detail: RequestEventDetail) {
    super(REQ_NAME, { detail });
  }
}

export class RequestSignals {
  initListeners = false;
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

  constructor() {
    console.debug("RequestSignals initialized");
  }

  initAndWatch(cb: (count: number) => void) {
    const unsubs = [this.onRequest(cb)];
    unsubs.push(this.initSignalListeners());
    unsubs.push(this.initSWSignalListener());
    return () => unsubs.forEach((unsub) => unsub());
  }
  init() {
    const unsubs: (() => void)[] = [];
    unsubs.push(this.initSWSignalListener());
    unsubs.push(this.initSignalListeners());
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

  private initSignalListeners() {
    const handler = (event: Event) => {
      const detail = (event as RequestEvent).detail;
      if (detail.type === REQ_SIGNAL.START) {
        this.count = this.count + 1;
        this.Count(this.count);
      } else if (detail.type === REQ_SIGNAL.END) {
        this.count = this.count - 1;
        this.Count(this.count);
      }
    };
    this.RequestEventBus.addEventListener(REQ_NAME, handler);
    return () => {
      this.RequestEventBus.removeEventListener(REQ_NAME, handler);
    };
  }

  private initSWSignalListener() {
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
  watchPromiseMembers<T extends object>(instance: T): T {
    return new Proxy(instance, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return (...args: unknown[]) => {
            try {
              const result = value.apply(target, args);
              if (result && typeof result.then === "function") {
                this.Start();
                return result.finally(() => this.End());
              }
              return result;
            } finally {
            }
          };
        }
        return value;
      },
    });
  }
}
export const RequestSignalsInstance = new RequestSignals();

export const useRequestSignals = () => {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(false);

  // const req

  useEffect(() => {
    return RequestSignalsInstance.initAndWatch((count) => {
      if (count <= 0) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          setPending(false);
        }, 1000);
      } else if (!pending) {
        setPending(true);
      }
    });
  }, [pending]);
  return { pending };
};
