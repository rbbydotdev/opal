import { stripTrailingSlash } from "@/lib/paths2";

export function optionalCORSBaseURL(corsProxy: string | undefined | null, origURL: string): string | undefined {
  const url = new URL(coerceProtocol(origURL));
  return corsProxy ? `${stripTrailingSlash(corsProxy)}/${url.host}${url.pathname}` : undefined;
}

const coerceProtocol = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};
