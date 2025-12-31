export function safeSerializer<T>(val: T, seen: WeakSet<object> = new WeakSet()): any {
  if (val && typeof val === "object") {

    if (seen.has(val as object)) return undefined; // no "[Circular]"
    seen.add(val as object);

    const maybeObj = val as Record<string, unknown> & {
      toJSON?: () => unknown;
    };

    if (typeof maybeObj.toJSON === "function") {
      try {
        const jsonValue = maybeObj.toJSON();
        return safeSerializer(jsonValue, seen);
      } catch {
        return undefined; // or you can still mark "[Unserializable: toJSON threw]"
      }
    }

    if (Array.isArray(val)) return (val as unknown[]).map((v) => safeSerializer(v, seen));

    const result: Record<string, unknown> = {};

    for (const k of Object.keys(val as object)) {
      const descriptor = Object.getOwnPropertyDescriptor(val, k);
      if (descriptor && typeof descriptor.get === "function") continue;

      try {
        const value = (val as Record<string, unknown>)[k];
        result[k] = safeSerializer(value, seen);
      } catch {
        // skip exceptions silently
      }
    }

    return result;
  }

  return val;
}
