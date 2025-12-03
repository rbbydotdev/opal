import { useLocation } from "@tanstack/react-router";

const RANGE_KEY = "hlRanges";
function rangesToSearchParams(ranges: [start: number, end: number][], meta?: Record<string, unknown>): string {
  const params = new URLSearchParams();
  params.set(RANGE_KEY, JSON.stringify(ranges));
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      params.set(key, JSON.stringify(value));
    }
  }
  return params.toString();
}

export function useHashURLRanges():
  | { start: number; end: number; hasRanges: true }
  | {
      start: null;
      end: null;
      hasRanges: false;
    } {
  // const hash = window.location.hash;
  const hash = useLocation().hash;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const [start, end] = parseParamsToRanges(params).ranges?.at(0) ?? [];
  if (start === undefined || end === undefined) {
    return { start: null, end: null, hasRanges: false };
  }
  return { start, end, hasRanges: true };
}

function parseParamsToRanges(params: URLSearchParams): {
  ranges: [start: number, end: number][] | null;
  meta: Record<string, unknown>;
} {
  let ranges: Array<[startStr: string, endStr: string]> | null = null;
  const meta: Record<string, unknown> = {};
  try {
    const rangeParam = params.get(RANGE_KEY);
    if (rangeParam) {
      const parsed = JSON.parse(rangeParam);
      if (Array.isArray(parsed)) {
        ranges = parsed as Array<[startStr: string, endStr: string]>;
      }
    }
    for (const [key, value] of params.entries()) {
      if (key === RANGE_KEY) continue;
      try {
        meta[key] = JSON.parse(value);
      } catch {
        meta[key] = value;
      }
    }
  } catch (_e) {
    console.warn(`Invalid range format in params ${params.toString()}`);
  }
  return {
    ranges: ranges ? ranges.map(([s, e]) => [parseInt(s), parseInt(e)]) : null,
    meta,
  };
}
