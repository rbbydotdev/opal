//Make an object temporally disposable via AsyncDisposable interface
//must implement destroy(): Promise<void> method
export function Temporal<T extends { destroy(): Promise<void> }>(obj: T): T & AsyncDisposable {
  let disposed = false;

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (prop === Symbol.asyncDispose) {
        return async () => {
          if (disposed) return;
          disposed = true;
          await target.destroy();
        };
      }

      if (disposed) {
        throw new Error("Resource already disposed");
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  };

  return new Proxy(obj, handler) as T & AsyncDisposable;
}
