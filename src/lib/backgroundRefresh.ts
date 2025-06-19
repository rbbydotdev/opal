// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function backgroundRefresh<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastValue: ReturnType<T>;
  return (...args: Parameters<T>): ReturnType<T> => {
    if (!timer) {
      lastValue = fn(...args) as ReturnType<T>;
      timer = setTimeout(() => {}, delay);
      return lastValue;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      lastValue = fn(...args) as ReturnType<T>;
    }, delay);
    return lastValue;
  };
}
