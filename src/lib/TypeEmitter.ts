import { EventEmitter } from "events";

export type TypedEmitter<Events extends Record<string, any>> = {
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): EventEmitter;
  once<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): EventEmitter;
  off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): EventEmitter;
  emit<K extends keyof Events>(event: K, payload: Events[K]): boolean;
  listen<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void;
  awaitEvent<K extends keyof Events>(event: K): Promise<Events[K]>;
} & EventEmitter;

export function CreateTypedEmitterClass<Events extends Record<string, any>>() {
  return class extends EventEmitter {
    awaitEvent<K extends keyof Events>(event: K): Promise<Events[K]> {
      return new Promise((resolve) => {
        const handler = (payload: Events[K]) => {
          this.off(event as string | symbol, handler);
          resolve(payload);
        };
        this.on(event as string | symbol, handler);
      });
    }
    listen<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
      super.on(event as string | symbol, listener);
      return () => {
        super.off(event as string | symbol, listener);
      };
    }
  };
}

export function CreateSuperTypedEmitterClass<Events extends Record<string, any>, Meta = {}>() {
  type ExtendedEvents = Events & {
    "*": Events[keyof Events] & Meta & { eventName: keyof Events };
  };

  return class {
    private emitter = new EventEmitter();
    constructor() {
      this.emitter.setMaxListeners(100);
    }

    on<K extends keyof ExtendedEvents>(event: K | (keyof Events)[], listener: (payload: ExtendedEvents[K]) => void): () => void {
      if (Array.isArray(event)) {
        const unsubscribers = event.map((e) => {
          this.emitter.on(e as string | symbol, listener);
          return () => this.emitter.off(e as string | symbol, listener);
        });
        return () => unsubscribers.forEach((unsub) => unsub());
      } else {
        this.emitter.on(event as string | symbol, listener);
        return () => this.emitter.off(event as string | symbol, listener);
      }
    }

    once<K extends keyof ExtendedEvents>(event: K, listener: (payload: ExtendedEvents[K]) => void): () => void {
      this.emitter.once(event as string | symbol, listener);
      return () => this.emitter.off(event as string | symbol, listener);
    }

    emit<K extends keyof Events>(event: K, payload: Events[K] & Meta): void {
      this.emitter.emit(event as string | symbol, payload);
      this.emitter.emit("*", { ...payload, eventName: event });
    }

    off<K extends keyof ExtendedEvents>(event: K, listener: (payload: ExtendedEvents[K]) => void): void {
      this.emitter.off(event as string | symbol, listener);
    }

    removeListener<K extends keyof ExtendedEvents>(event: K, listener: (payload: ExtendedEvents[K]) => void): void {
      this.emitter.removeListener(event as string | symbol, listener);
    }

    clearListeners(): void {
      this.emitter.removeAllListeners();
    }

    awaitEvent<K extends keyof ExtendedEvents>(event: K): Promise<ExtendedEvents[K]> {
      return new Promise((resolve) => {
        const handler = (payload: ExtendedEvents[K]) => {
          this.emitter.off(event as string | symbol, handler);
          resolve(payload);
        };
        this.on(event, handler);
      });
    }
  };
}

export function CreateTypedEmitter<Events extends Record<string, any>>(): TypedEmitter<Events> {
  return new (CreateTypedEmitterClass<Events>())() as TypedEmitter<Events>;
}

export class SuperEmitter<Events extends Record<string, any> = Record<string, any>> {
  private emitter = new EventEmitter();
  constructor() {
    this.emitter.setMaxListeners(100);
  }

  on<K extends keyof Events>(event: K | (keyof Events)[], listener: (payload: Events[K]) => void): () => void {
    if (Array.isArray(event)) {
      const unsubscribers = event.map((e) => {
        this.emitter.on(e as string | symbol, listener);
        return () => this.emitter.off(e as string | symbol, listener);
      });
      return () => unsubscribers.forEach((unsub) => unsub());
    } else {
      this.emitter.on(event as string | symbol, listener);
      return () => this.emitter.off(event as string | symbol, listener);
    }
  }

  once<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
    this.emitter.once(event as string | symbol, listener);
    return () => this.emitter.off(event as string | symbol, listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.emitter.emit(event as string | symbol, payload);
  }

  off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    this.emitter.off(event as string | symbol, listener);
  }

  removeListener<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    this.emitter.removeListener(event as string | symbol, listener);
  }

  clearListeners(): void {
    this.emitter.removeAllListeners();
  }

  awaitEvent<K extends keyof Events>(event: K): Promise<Events[K]> {
    return new Promise((resolve) => {
      const handler = (payload: Events[K]) => {
        this.emitter.off(event as string | symbol, handler);
        resolve(payload);
      };
      this.on(event, handler);
    });
  }
}

export class OmniBusEmitter extends CreateSuperTypedEmitterClass<Record<string, any>>() {
  private symbolToEmitterMap = new Map<symbol, any>();
  private listenerCleanupMap = new Map<symbol, () => void>();

  connect<T extends { on: (event: "*", listener: any) => any }>(
    emitterIdent: symbol,
    emitter: T
  ): void {
    if (typeof emitterIdent !== 'symbol') {
      throw new Error(`emitterIdent must be a symbol`);
    }

    // Store emitter by symbol
    this.symbolToEmitterMap.set(emitterIdent, emitter);

    // Listen to the wildcard event and forward all events to this omnibus
    const cleanup = emitter.on("*", (payload: any) => {
      const { eventName, ...eventPayload } = payload;
      
      // Add source emitter metadata to the payload
      const enhancedPayload = {
        ...eventPayload,
        __sourceEmitter: emitterIdent
      };
      
      this.emit(eventName as any, enhancedPayload);
    });

    // Store cleanup function for later disconnection
    this.listenerCleanupMap.set(emitterIdent, cleanup);
  }

  onType<Events extends Record<string, any>, K extends keyof Events>(
    emitterIdent: symbol,
    event: K,
    listener: (payload: Events[K]) => void
  ): () => void {
    return this.on("*" as any, (payload: any) => {
      if (payload.eventName === event && payload.__sourceEmitter === emitterIdent) {
        const { eventName, __sourceEmitter, ...cleanPayload } = payload;
        listener(cleanPayload as Events[K]);
      }
    });
  }

  get<T>(emitterIdent: symbol): T | undefined {
    return this.symbolToEmitterMap.get(emitterIdent);
  }

  disconnect(emitterIdent: symbol): void {
    const emitter = this.symbolToEmitterMap.get(emitterIdent);
    const cleanup = this.listenerCleanupMap.get(emitterIdent);
    
    if (emitter && cleanup) {
      // Remove the event listener
      cleanup();
      
      // Remove from all maps
      this.symbolToEmitterMap.delete(emitterIdent);
      this.listenerCleanupMap.delete(emitterIdent);
    }
  }

  getConnectedEmitters(): any[] {
    return Array.from(this.symbolToEmitterMap.values());
  }

  getConnectedIdentifiers(): symbol[] {
    return Array.from(this.symbolToEmitterMap.keys());
  }
}

// Re-export the singleton for convenience
export { OmniBus } from "./OmniBus";
