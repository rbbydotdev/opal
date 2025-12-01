import { Mutex } from "async-mutex";

export function RefreshAuth<T extends object>(
  clientFactory: () => T,
  checkAuth: () => Promise<boolean> | boolean,
  reauth: () => Promise<void> | void
): T {
  const mutex = new Mutex();
  let client: T | null = null;
  let isReauthing = false;

  return new Proxy({} as T, {
    get(target, prop, receiver) {
      const originalClient = client || (client = clientFactory());
      const value = (originalClient as any)[prop];

      if (typeof value === "function") {
        return async function (...args: any[]) {
          const release = await mutex.acquire();
          try {
            if (!isReauthing) {
              const isExpired = !(await checkAuth());
              if (isExpired) {
                isReauthing = true;
                await reauth();
                client = clientFactory();
                isReauthing = false;
              }
            }
            const currentClient = client || originalClient;
            return await (currentClient as any)[prop].apply(currentClient, args);
          } finally {
            release();
          }
        };
      }

      if (typeof value === "object" && value !== null) {
        return new Proxy(value, {
          get(nestedTarget, nestedProp) {
            const nestedValue = (nestedTarget as any)[nestedProp];
            if (typeof nestedValue === "function") {
              return async function (...args: any[]) {
                const release = await mutex.acquire();
                try {
                  if (!isReauthing) {
                    const isExpired = !(await checkAuth());
                    if (isExpired) {
                      isReauthing = true;
                      await reauth();
                      client = clientFactory();
                      isReauthing = false;
                    }
                  }
                  const currentClient = client || originalClient;
                  const currentNestedTarget = (currentClient as any)[prop];
                  return await currentNestedTarget[nestedProp].apply(currentNestedTarget, args);
                } finally {
                  release();
                }
              };
            }
            return nestedValue;
          },
        });
      }

      return value;
    },
  });
}
