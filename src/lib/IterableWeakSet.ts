export interface IIterableWeakSet<T extends object> extends Iterable<T> {
  add(value: T): IIterableWeakSet<T>;
  delete(value: T): boolean;
  has(value: T): boolean;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
  readonly [Symbol.toStringTag]: string;
}

export class IterableWeakSet<T extends object> implements IIterableWeakSet<T> {
  // Core weak + soft storage
  #weakSet = new WeakSet<T>();
  #refs = new Set<WeakRef<T>>();
  #registry = new FinalizationRegistry<WeakRef<T>>((ref) => {
    // when an object is GC'd, remove its weakref from tracking
    this.#refs.delete(ref);
  });

  get [Symbol.toStringTag]() {
    return "IterableWeakSet";
  }

  add(value: T): this {
    this.#weakSet.add(value);
    const ref = new WeakRef(value);
    this.#refs.add(ref);
    this.#registry.register(value, ref);
    return this;
  }

  delete(value: T): boolean {
    const deleted = this.#weakSet.delete(value);
    if (deleted) {
      for (const ref of this.#refs) {
        if (ref.deref() === value) {
          this.#refs.delete(ref);
          this.#registry.unregister(ref);
          break;
        }
      }
    }
    return deleted;
  }

  has(value: T): boolean {
    return this.#weakSet.has(value);
  }

  *values(): IterableIterator<T> {
    for (const ref of this.#refs) {
      const value = ref.deref();
      if (value) yield value;
    }
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.values();
  }
}
