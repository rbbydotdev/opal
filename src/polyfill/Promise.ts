if (!(Promise as any).obj) {
  const allOriginal = Promise.all;

  (Promise as any).obj = function allObject(promises: { [key: string]: Promise<any> }) {
    if (promises && typeof promises === "object" && !Array.isArray(promises)) {
      const entries = Object.entries(promises);
      const promiseArray = entries.map(([key, value]) => Promise.resolve(value).then((v) => [key, v]));
      return allOriginal.call(Promise, promiseArray).then((entries) => Object.fromEntries(entries as [string, any][]));
    }
    throw new Error("Promise.obj requires an object");
  };
}
