export function ensureEncodedURI(key: string): string {
  return key !== decodeURI(key) ? key : encodeURI(key);
}
