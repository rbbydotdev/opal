/* eslint-disable @typescript-eslint/no-explicit-any */
import "@total-typescript/ts-reset";

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepNonNullable<T extends object, K extends keyof T = never> = {
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
