export interface IIterableWeakMap<T extends object, V> {
  get(key: T): V | undefined;
  set(key: T, value: V): IIterableWeakMap<T, V>;
  delete(key: T): boolean;
  has(key: T): boolean;
  keys(): IterableIterator<T>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[T, V]>;
  [Symbol.iterator](): IterableIterator<[T, V]>;
  readonly [Symbol.toStringTag]: string;
}

export class IterableWeakMap<T extends object, V> implements IIterableWeakMap<T, V> {
  // Internal storages
  #weakMap = new WeakMap<T, V>();
  #refs = new Set<WeakRef<T>>();
  #registry = new FinalizationRegistry<WeakRef<T>>((ref) => {
    // Cleanup any dead refs when the key is garbage-collected
    this.#refs.delete(ref);
  });

  get [Symbol.toStringTag]() {
    return "IterableWeakMap";
  }

  get(key: T): V | undefined {
    return this.#weakMap.get(key);
  }

  set(key: T, value: V): this {
    this.#weakMap.set(key, value);
    const ref = new WeakRef(key);
    this.#refs.add(ref);
    this.#registry.register(key, ref);
    return this;
  }

  delete(key: T): boolean {
    const deleted = this.#weakMap.delete(key);
    if (deleted) {
      for (const ref of this.#refs) {
        if (ref.deref() === key) {
          this.#refs.delete(ref);
          this.#registry.unregister(ref);
          break;
        }
      }
    }
    return deleted;
  }

  has(key: T): boolean {
    return this.#weakMap.has(key);
  }

  *keys(): IterableIterator<T> {
    for (const ref of this.#refs) {
      const key = ref.deref();
      if (key) yield key;
    }
  }

  *values(): IterableIterator<V> {
    for (const key of this.keys()) {
      const value = this.#weakMap.get(key);
      if (value !== undefined) yield value;
    }
  }

  *entries(): IterableIterator<[T, V]> {
    for (const key of this.keys()) {
      const value = this.#weakMap.get(key);
      if (value !== undefined) yield [key, value] as [T, V];
    }
  }

  *[Symbol.iterator](): IterableIterator<[T, V]> {
    yield* this.entries();
  }
}
