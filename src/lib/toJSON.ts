export function toJSON<T>(val: T, seen: WeakSet<object> = new WeakSet()): any {
  if (val && typeof val === "object") {
    if (seen.has(val as object)) return undefined;
    seen.add(val as object);

    const maybeObj = val as Record<string, unknown> & {
      toJSON?: () => unknown;
    };

    if (typeof maybeObj.toJSON === "function") {
      try {
        const jsonValue = maybeObj.toJSON();
        return toJSON(jsonValue, seen);
      } catch {
        return undefined;
      }
    }

    if (Array.isArray(val)) return (val as unknown[]).map((v) => toJSON(v, seen));

    const result: Record<string, unknown> = {};

    for (const k of Object.keys(val as object)) {
      const descriptor = Object.getOwnPropertyDescriptor(val, k);
      if (descriptor && typeof descriptor.get === "function") continue;

      try {
        const value = (val as Record<string, unknown>)[k];
        result[k] = toJSON(value, seen);
      } catch {
        // skip exceptions silently
      }
    }

    return result;
  }

  return val;
}
