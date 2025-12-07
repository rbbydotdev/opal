export function removeFalsy<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(removeFalsy) as unknown as T;
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => Boolean(v))
        .map(([k, v]) => [k, removeFalsy(v)])
    ) as T;
  }
  return obj;
}
