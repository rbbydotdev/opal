export function toPromise<T, U extends unknown[]>(fn: (...args: U) => T | Promise<T>) {
  return function (...args: U): Promise<T> {
    try {
      const result = fn(...args);
      // If the result is a promise, return it directly
      if (result instanceof Promise) {
        return result;
      }
      // Otherwise, wrap the result in a promise
      return Promise.resolve(result);
    } catch (error) {
      // If the function throws an error, reject the promise
      return Promise.reject(error);
    }
  };
}
