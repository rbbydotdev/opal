interface IIterableWeakSet<T extends object> extends Iterable<T> {
  add(value: T): IIterableWeakSet<T>;
  delete(value: T): boolean;
  has(value: T): boolean;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
  readonly [Symbol.toStringTag]: string;
}

/** Global ref cache to ensure unique WeakRefs for each object */
const _refs: WeakMap<object, WeakRef<object>> = new WeakMap();

function _getRef<T extends object>(obj: T): WeakRef<T> {
  let ref = _refs.get(obj) as WeakRef<T> | undefined;
  if (!ref) {
    ref = new WeakRef(obj);
    _refs.set(obj, ref);
  }
  return ref;
}

/**
 * IterableWeakSet provides WeakSet semantics (weak keys)
 * with safe, on-demand iteration over live objects.
 */
export class IterableWeakSet<T extends object> implements IIterableWeakSet<T> {
  /** Internal Set stores WeakRefs instead of direct objects */
  #set = new Set<WeakRef<T>>();

  /** FinalizationRegistry cleans up when values are GC'd */
  #registry = new FinalizationRegistry<WeakRef<T>>((ref) => {
    // When value is garbage-collected, remove the WeakRef
    this.#set.delete(ref);
  });

  get [Symbol.toStringTag](): string {
    return "IterableWeakSet";
  }

  add(value: T): this {
    const ref = _getRef(value);
    if (!this.#set.has(ref)) {
      this.#registry.register(value, ref, ref);
      this.#set.add(ref);
    }
    return this;
  }

  delete(value: T): boolean {
    const ref = _refs.get(value) as WeakRef<T> | undefined;
    if (!ref) return false;
    const removed = this.#set.delete(ref);
    if (removed) this.#registry.unregister(ref);
    return removed;
  }

  has(value: T): boolean {
    const ref = _refs.get(value);
    return ref ? this.#set.has(ref as WeakRef<T>) : false;
  }

  *values(): IterableIterator<T> {
    for (const ref of this.#set) {
      const value = ref.deref();
      if (value) {
        yield value;
      } else {
        // remove expired weakref during iteration
        this.#set.delete(ref);
        this.#registry.unregister(ref);
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield* this.values();
  }
}
