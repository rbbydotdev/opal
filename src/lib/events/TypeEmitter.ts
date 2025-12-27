import { IterableWeakSet } from "@/lib/IterableWeakSet";
import { EventEmitter } from "events";

// Helper function to create symbol-like objects for emitter identification
export function EmitterSymbol(description?: string): object {
  return Object.freeze({
    description: description || "",
    [Symbol.toStringTag]: "EmitterSymbol",
    toString() {
      return `EmitterSymbol(${String(this.description)})`;
    },
  });
}

type TypedEmitter<Events extends Record<string, any>> = {
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

    on<K extends keyof ExtendedEvents>(
      event: K | (keyof Events)[],
      listener: (payload: ExtendedEvents[K]) => void
    ): () => void {
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
      // Special handling for error events
      if (event === 'error') {
        const errorListeners = this.emitter.listenerCount('error');
        if (errorListeners === 0) {
          console.error(`Unhandled error event: ${payload}`);
          return;
        }
      }

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

export function CreateSuperTypedEmitter<Events extends Record<string, any>, Meta = {}>() {
  return new (CreateSuperTypedEmitterClass<Events, Meta>())();
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
    // Special handling for error events
    if (event === 'error') {
      const errorListeners = this.emitter.listenerCount('error');
      if (errorListeners === 0) {
        console.error(`Unhandled error event: ${payload}`);
        return;
      }
    }

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
  private instanceToEmitterMap = new WeakMap<object, any>();
  private instanceToCleanupMap = new WeakMap<object, () => void>();
  private instanceToClassMap = new WeakMap<object, symbol>();
  private classToInstancesMap = new Map<symbol, IterableWeakSet<object>>();

  connect<T extends { on: (event: "*", listener: any) => any }>(
    classIdent: symbol,
    emitter: T,
    instanceIdent?: object
  ): () => void {
    if (typeof classIdent !== "symbol") {
      throw new Error(`classIdent must be a symbol`);
    }

    // Use provided instanceIdent, emitter's IIDENT, or generate one
    const finalInstanceIdent =
      instanceIdent || (emitter as any).IIDENT || EmitterSymbol(`${classIdent.description || "Unknown"}Instance`);

    // Store emitter by instance identifier using WeakMap
    this.instanceToEmitterMap.set(finalInstanceIdent, emitter);
    this.instanceToClassMap.set(finalInstanceIdent, classIdent);

    // Track instances by class using IterableWeakSet
    if (!this.classToInstancesMap.has(classIdent)) {
      this.classToInstancesMap.set(classIdent, new IterableWeakSet());
    }
    this.classToInstancesMap.get(classIdent)!.add(finalInstanceIdent);

    // Listen to the wildcard event and forward all events to this omnibus
    const cleanup = emitter.on("*", (payload: any) => {
      const { eventName, ...eventPayload } = payload;

      // Add source emitter metadata to the payload
      const enhancedPayload = {
        ...eventPayload,
        __sourceClass: classIdent,
        __sourceInstance: finalInstanceIdent,
        eventName,
      };

      this.emit(eventName as any, enhancedPayload);
    });

    // Store cleanup function using WeakMap
    this.instanceToCleanupMap.set(finalInstanceIdent, cleanup);

    // Return disconnect function
    return () => this.disconnect(finalInstanceIdent);
  }

  onType<Events extends Record<string, any>, K extends keyof Events>(
    classIdent: symbol,
    event: K | K[],
    listener: (payload: Events[K]) => void
  ): () => void {
    if (Array.isArray(event)) {
      const unsubscribers = event.map((e) => {
        return this.on("*" as any, (payload: any) => {
          if (payload.eventName === e && payload.__sourceClass === classIdent) {
            const { eventName, __sourceClass, __sourceInstance, ...cleanPayload } = payload;
            listener(cleanPayload as Events[K]);
          }
        });
      });
      return () => unsubscribers.forEach((unsub) => unsub());
    } else {
      return this.on("*" as any, (payload: any) => {
        if (payload.eventName === event && payload.__sourceClass === classIdent) {
          const { eventName, __sourceClass, __sourceInstance, ...cleanPayload } = payload;
          listener(cleanPayload as Events[K]);
        }
      });
    }
  }

  onInstance<Events extends Record<string, any>, K extends keyof Events>(
    instanceIdent: object,
    event: K | K[],
    listener: (payload: Events[K]) => void
  ): () => void {
    if (Array.isArray(event)) {
      const unsubscribers = event.map((e) => {
        return this.on("*" as any, (payload: any) => {
          if (payload.eventName === e && payload.__sourceInstance === instanceIdent) {
            const { eventName, __sourceClass, __sourceInstance, ...cleanPayload } = payload;
            listener(cleanPayload as Events[K]);
          }
        });
      });
      return () => unsubscribers.forEach((unsub) => unsub());
    } else {
      return this.on("*" as any, (payload: any) => {
        if (payload.eventName === event && payload.__sourceInstance === instanceIdent) {
          const { eventName, __sourceClass, __sourceInstance, ...cleanPayload } = payload;
          listener(cleanPayload as Events[K]);
        }
      });
    }
  }

  get<T>(instanceIdent: object): T | undefined {
    return this.instanceToEmitterMap.get(instanceIdent);
  }

  getByClass<T>(classIdent: symbol): T[] {
    const instances = this.classToInstancesMap.get(classIdent);
    if (!instances) return [];

    return Array.from(instances)
      .map((instance) => this.instanceToEmitterMap.get(instance))
      .filter((emitter) => emitter !== undefined) as T[];
  }

  disconnect(instanceIdent: object): void {
    const emitter = this.instanceToEmitterMap.get(instanceIdent);
    const cleanup = this.instanceToCleanupMap.get(instanceIdent);
    const classIdent = this.instanceToClassMap.get(instanceIdent);

    if (emitter && cleanup) {
      // Remove the event listener
      cleanup();

      // Remove from class tracking
      if (classIdent) {
        const instances = this.classToInstancesMap.get(classIdent);
        if (instances) {
          instances.delete(instanceIdent);
          // IterableWeakSet will automatically clean up, but we can remove empty entries
          // Note: IterableWeakSet doesn't have a size property, so we'll keep the entry
        }
      }

      // WeakMaps will automatically clean themselves up
      // but we can explicitly delete for immediate cleanup
      this.instanceToEmitterMap.delete(instanceIdent);
      this.instanceToCleanupMap.delete(instanceIdent);
      this.instanceToClassMap.delete(instanceIdent);
    }
  }

  disconnectClass(classIdent: symbol): void {
    const instances = this.classToInstancesMap.get(classIdent);
    if (instances) {
      // Disconnect all instances of this class
      // Convert to array first since disconnect() modifies the set
      const instanceArray = Array.from(instances);
      instanceArray.forEach((instance) => this.disconnect(instance));
    }
  }

  getConnectedEmitters(): any[] {
    const emitters: any[] = [];
    for (const instances of this.classToInstancesMap.values()) {
      for (const instance of instances) {
        const emitter = this.instanceToEmitterMap.get(instance);
        if (emitter) emitters.push(emitter);
      }
    }
    return emitters;
  }

  getConnectedClasses(): symbol[] {
    return Array.from(this.classToInstancesMap.keys());
  }
}
