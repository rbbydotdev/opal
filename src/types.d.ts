import "@total-typescript/ts-reset";

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepNonNullable<T extends object, K extends keyof T = never> = {
  [P in keyof T]: P extends K
    ? T[P]
    : NonNullable<T[P]> extends T
    ? DeepNonNullable<NonNullable<T[P]>, K>
    : NonNullable<T[P]>;
};
