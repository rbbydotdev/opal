export class Store {
  constructor(protected readonly name: string) {}
  set(key: string, value: unknown) {
    try {
      const store: { [key: string]: unknown } = localStorage.getItem(this.name)
        ? (JSON.parse(localStorage.getItem(this.name) as string) as { [key: string]: unknown })
        : {};
      //check if store is an object we can add a key to
      if (typeof store === "object") {
        store[key] = value;
      } else {
        throw new Error("unknown type stored in localStore");
      }
      localStorage.setItem(this.name, JSON.stringify(store));
    } catch (e) {
      localStorage.removeItem(key);
      throw e;
    }
  }
  get(key: string): unknown {
    const store: { [key: string]: unknown } = localStorage.getItem(this.name)
      ? (JSON.parse(localStorage.getItem(this.name) as string) as { [key: string]: unknown })
      : {};
    if (typeof store === "object") {
      return store[key];
    } else {
      localStorage.removeItem(key);
      throw new Error("unknown type stored in localStore");
    }
  }
}
