export function addQueryParams(path: string, params: Record<string, string | number>) {
  const url = new URL(path, "http://localhost");
  for (const key in params) {
    url.searchParams.append(key, String(params[key]));
  }
  return url.href.replace(url.origin, "");
}
