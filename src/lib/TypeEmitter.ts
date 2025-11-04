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

export function CreateSuperTypedEmitterClass<Events extends Record<string, any>>() {
  return class {
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
