export function isIterable<T>(obj: any): obj is Iterable<T> {
  return obj && typeof obj[Symbol.iterator] === "function";
}
