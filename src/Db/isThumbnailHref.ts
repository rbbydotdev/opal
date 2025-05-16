export function isThumbnailHref(href: string) {
  const url = new URL(String(href), "http://localhost");
  return url.searchParams.has("thumb");
}
