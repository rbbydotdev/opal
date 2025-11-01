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
export function CreateTypedEmitter<Events extends Record<string, any>>(): TypedEmitter<Events> {
  return new (CreateTypedEmitterClass<Events>())() as TypedEmitter<Events>;
}
