import { useQueryState } from "nuqs";

const RANGE_KEY = "hlRanges";

const rangesParser = {
  parse: (value: string): [start: number, end: number][] | null => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (Array.isArray(item) && item.length >= 2) {
            return [parseInt(String(item[0])), parseInt(String(item[1]))];
          }
          return [0, 0]; // fallback
        });
      }
    } catch {
      console.warn(`Invalid range format: ${value}`);
    }
    return null;
  },
  serialize: (value: [start: number, end: number][] | null): string => {
    return value ? JSON.stringify(value) : "";
  },
};

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
  const [ranges] = useQueryState(RANGE_KEY, rangesParser);
  const [start, end] = ranges?.at(0) ?? [];
  if (start === undefined || end === undefined) {
    return { start: null, end: null, hasRanges: false };
  }
  return { start, end, hasRanges: true };
}

