/* eslint-disable @typescript-eslint/no-explicit-any */
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type DeepNonNullable<T extends object, K extends keyof T = never> = {
  [P in keyof T]: P extends K
    ? T[P]
    : NonNullable<T[P]> extends T
      ? DeepNonNullable<NonNullable<T[P]>, K>
      : NonNullable<T[P]>;
};

type GenYieldType<T extends (...args: any) => Generator<any, any, any>> = T extends (
  ...args: any
) => Generator<infer R, any, any>
  ? R
  : never;

type AsyncGenYieldType<T extends (...args: any) => AsyncGenerator<any, any, any>> = T extends (
  ...args: any
) => AsyncGenerator<infer R, any, any>
  ? R
  : never;

type UnwrapAsyncGeneratorYield<T> = T extends AsyncGenerator<infer U, any, any> ? Awaited<U> : never;
type ValidateDisjoint<T, U> = [Extract<keyof T, keyof U>] extends [never]
  ? unknown // No overlapping keys, the type is valid.
  : {
      "Error: Property keys cannot overlap": Extract<keyof T, keyof U>;
    };

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { [brand]: B };

// interface ObjectConstructor {
//   /**
//    * Groups members of an iterable according to the return value of the passed callback.
//    * @param items An iterable.
//    * @param keySelector A callback which will be invoked for each item in items.
//    */
//   groupBy<K extends PropertyKey, T>(items: Iterable<T>, keySelector: (item: T, index: number) => K): Record<K, T[]>;
// }

declare module "@zumer/snapdom" {
  interface SnapResult {
    toBlob: (options: SnapOptions) => Promise<Blob>;
  }
}

type PreviewWorkerApi = {
  renderAndSnapshot: (editId: number) => Promise<Blob>;
  renderFromMarkdownAndSnapshot: (markdown: string, editId: number) => Promise<Blob>;
};

type ClassPropertiesOnly<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

declare module "*.md?raw" {
  const content: string;
  export default content;
}

declare module "*.css?raw" {
  const content: string;
  export default content;
}
