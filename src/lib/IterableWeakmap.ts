export interface IIterableWeakMap<T extends object, P> {
  get: (key: T) => P | undefined;
  set: (key: T, value: P) => IIterableWeakMap<T, P>;
  delete: (key: T) => boolean;
  has: (key: T) => boolean;
  keys: () => T[];
  values: () => P[];
  [Symbol.toStringTag]: string;
}
export default function IterableWeakMap<T extends object, P>(): IIterableWeakMap<T, P> {
  const weakMap = new WeakMap(),
    arrKeys: T[] = [],
    arrValues: P[] = [],
    objectToIndex = new WeakMap<T, number>(),
    _ = {
      get [Symbol.toStringTag]() {
        return "IterableWeakMap";
      },
      get: (key: T): P | undefined => weakMap.get(key) as P | undefined,
      set: (key: T, value: P): IIterableWeakMap<T, P> => {
        weakMap.set(key, value);
        objectToIndex.set(key, arrKeys.length);
        arrKeys.push(key);
        arrValues.push(value);

        return _;
      },
      delete: (key: T): boolean => {
        if (!weakMap.get(key) || !objectToIndex.has(key)) {
          return false;
        }
        weakMap.delete(key);
        arrKeys.splice(objectToIndex.get(key)!, 1);
        arrValues.splice(objectToIndex.get(key)!, 1);
        objectToIndex.delete(key);

        return true;
      },
      has: (key: T): boolean => weakMap.has(key),
      keys: (): T[] => arrKeys,
      values: (): P[] => arrValues,
    };
  return Object.freeze(_);
}
