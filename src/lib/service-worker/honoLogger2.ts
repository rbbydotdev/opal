function time(start: number): string {
  const diff = Date.now() - start;
  return diff + "ms";
}

async function log(
  fn: (msg: string) => void,
  prefix: "<--" | "-->",
  method: string,
  path: string,
  status?: number,
  elapsed?: string
) {
  const out =
    prefix === "<--" // Incoming
      ? `${prefix} ${method} ${path}`
      : `${prefix} ${method} ${path} ${status} ${elapsed}`;
  fn(out);
}
export const honoLogger2 = (fn: (msg: string) => void = console.log) => {
  return async function logger2(c: any, next: () => Promise<void>) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));

    await log(fn, "<--", method, path);

    const start = Date.now();
    await next();

    await log(fn, "-->", method, path, c.res.status, time(start));
  };
};
