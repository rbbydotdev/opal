export function promisifyHandler(handler: {
  onsuccess: ((this: any, ev: Event) => any) | null;
  onerror: ((this: any, ev: Event) => any) | null;
}) {
  return new Promise<void>((resolve, reject) => {
    handler.onsuccess = function () {
      resolve();
    };
    handler.onerror = function (ev) {
      const err = (this as any)?.error ?? (ev as any)?.target?.error ?? new Error("handler failed");
      reject(err);
    };
  });
}
