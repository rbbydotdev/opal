import { useSearch } from "@tanstack/react-router";

export function useURLRanges():
  | { start: number; end: number; hasRanges: true }
  | {
      start: null;
      end: null;
      hasRanges: false;
    } {
  const search = useSearch({ from: "/_app/workspace/$workspaceName/$" });
  const range = search.HL;

  if (range && range.length === 2) {
    const [start, end] = range;
    return { start, end, hasRanges: true };
  }

  return { start: null, end: null, hasRanges: false };
}
