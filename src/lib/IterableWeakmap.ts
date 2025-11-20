export interface IIterableWeakMap<K extends object, V> extends Iterable<[K, V]> {
  get(key: K): V | undefined;
  set(key: K, value: V, onDrop?: (value: V) => void): this;
  delete(key: K): boolean;
  has(key: K): boolean;
  clear(): void;
  readonly size: number;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
}

/**
 * Global lookup to guarantee each object has a persistent WeakRef
 * (avoids multiple WeakRefs for the same key)
 */
const _refs: WeakMap<object, WeakRef<object>> = new WeakMap();

function _getRef<T extends object>(obj: T): WeakRef<T> {
  let ref = _refs.get(obj) as WeakRef<T> | undefined;
  if (!ref) {
    ref = new WeakRef(obj);
    _refs.set(obj, ref);
  }
  return ref;
}

const _noop = <T>(_value: T): void => {};

/**
 * IterableWeakMap provides WeakMap semantics (weak keys),
 * but also supports safe iteration over live entries.
 */
export class IterableWeakMap<K extends object, V> implements IIterableWeakMap<K, V> {
  // Internal storage of WeakRefs instead of strong keys
  #map = new Map<WeakRef<K>, V>();

  // FinalizationRegistry cleans up when a key is collected
  #registry = new FinalizationRegistry<[WeakRef<K>, (value: V) => void, V]>(([ref, onDrop, value]) => {
    // Remove from internal map and call provided cleanup callback
    this.#map.delete(ref);
    onDrop(value);
  });

  get size(): number {
    // Live count only
    return [...this].length;
  }

  has(key: K): boolean {
    const ref = _refs.get(key);
    return ref ? this.#map.has(ref as WeakRef<K>) : false;
  }

  get(key: K): V | undefined {
    const ref = _refs.get(key) as WeakRef<K> | undefined;
    return ref ? this.#map.get(ref) : undefined;
  }

  set(key: K, value: V, onDrop: (value: V) => void = _noop): this {
    const ref = _getRef(key);
    if (!this.#map.has(ref)) {
      this.#registry.register(key, [ref, onDrop, value], ref);
    }
    this.#map.set(ref, value);
    return this;
  }

  delete(key: K): boolean {
    const ref = _refs.get(key) as WeakRef<K> | undefined;
    if (!ref) return false;
    const had = this.#map.delete(ref);
    if (had) this.#registry.unregister(ref);
    return had;
  }

  clear(): void {
    for (const ref of this.#map.keys()) {
      this.#registry.unregister(ref);
    }
    this.#map.clear();
  }

  *keys(): IterableIterator<K> {
    for (const ref of this.#map.keys()) {
      const key = ref.deref();
      if (key) yield key;
      else this.#cleanupRef(ref);
    }
  }

  *values(): IterableIterator<V> {
    for (const [key, value] of this.entries()) {
      yield value;
    }
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [ref, value] of this.#map.entries()) {
      const key = ref.deref();
      if (key) yield [key, value];
      else this.#cleanupRef(ref);
    }
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    yield* this.entries();
  }

  // Remove dangling WeakRefs
  #cleanupRef(ref: WeakRef<K>): void {
    this.#map.delete(ref);
    this.#registry.unregister(ref);
  }
}
