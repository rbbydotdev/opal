/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonFileSystem } from "@/Db/Disk";
import { AbsPath } from "@/lib/paths2";
import { Mutex } from "async-mutex";

// MutexFs: No 'any' used
export class MutexFs implements CommonFileSystem {
  fs: CommonFileSystem;

  constructor(fs: CommonFileSystem, protected mutex = new Mutex()) {
    this.fs = fs;
  }

  async readdir(path: string) {
    return this.mutex.runExclusive(() => this.fs.readdir(path));
  }

  async stat(path: string) {
    return this.mutex.runExclusive(() => this.fs.stat(path));
  }

  async readFile(path: string, options?: { encoding?: "utf8" }) {
    return this.mutex.runExclusive(() => this.fs.readFile(path, options));
  }

  async mkdir(path: AbsPath, options?: { recursive?: boolean; mode: number }) {
    return this.mutex.runExclusive(() => this.fs.mkdir(path, options));
  }

  async rename(oldPath: AbsPath, newPath: AbsPath) {
    return this.mutex.runExclusive(() => this.fs.rename(oldPath, newPath));
  }

  async unlink(path: AbsPath) {
    return this.mutex.runExclusive(() => this.fs.unlink(path));
  }

  async writeFile(path: AbsPath, data: Uint8Array | Buffer | string, options?: { encoding?: "utf8"; mode: number }) {
    return this.mutex.runExclusive(() => this.fs.writeFile(path, data, options));
  }
}

// ExclusifyClass: No 'any' used
export function ExclusifyClass<T extends new (...args: unknown[]) => object>(BaseClass: T) {
  //@ts-expect-error
  return class ExclusiveClass extends BaseClass {
    protected mutex = new Mutex();

    constructor(...args: any[]) {
      super(...args);

      const proto = Object.getPrototypeOf(this);
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === "constructor") continue;
        const prop = (this as Record<string, unknown>)[key];
        if (typeof prop === "function" && prop.constructor.name === "AsyncFunction") {
          (this as Record<string, unknown>)[key] = async (...fnArgs: any[]) => {
            return this.mutex.runExclusive(() => (prop as (...args: any[]) => unknown).apply(this, fnArgs));
          };
        }
      }
    }
  };
}

// ExclusifyInstanceAsyncFn: No 'any' used
export function ExclusifyInstanceAsyncFn<T extends object>(instance: T, mutex = new Mutex()): T {
  return new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function" && value.constructor.name === "AsyncFunction") {
        return (...args: unknown[]) => mutex.runExclusive(() => value.apply(target, args));
      }
      return value;
    },
  });
}

// ExclusifyInstance: No 'any' used, works for all Promise-returning functions
export function ExclusifyInstance<T extends object>(instance: T, mutex = new Mutex()): T {
  return new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          const result = value.apply(target, args);
          if (result && typeof result.then === "function") {
            return mutex.runExclusive(() => result);
          }
          return result;
        };
      }
      return value;
    },
  });
}
