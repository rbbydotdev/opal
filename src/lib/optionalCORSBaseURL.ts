import { stripTrailingSlash } from "@/lib/paths2";

export function optionalCORSBaseURL(corsProxy: string | undefined | null, origURL: string): string | undefined {
  return corsProxy ? `${stripTrailingSlash(corsProxy)}/${new URL(coerceProtocol(origURL)).host}` : undefined;
}

const coerceProtocol = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};
