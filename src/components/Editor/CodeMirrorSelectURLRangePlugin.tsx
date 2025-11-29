import { EditorSelection, StateEffect, StateField } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";

// Effect to mark ranges as applied
export const setAppliedRangesEffect = StateEffect.define<string>();

// State field to track applied highlight ranges
export const appliedRangesField = StateField.define<string | null>({
  create: () => null,
  update: (value, tr) => {
    const effect = tr.effects.find((e) => e.is(setAppliedRangesEffect));
    return effect ? effect.value : value;
  },
});

export const codeMirrorSelectURLRangePlugin = (hlRanges: [start: number, end: number][] | null) =>
  ViewPlugin.fromClass(
    class {
      private view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
      }

      private handleSelectRanges = (ranges: [start: number, end: number][]) => {
        if (!ranges.length) return;
        const docLength = this.view.state.doc.length;
        if (!docLength) return;

        const selections = ranges
          .map(([start, end]) => {
            // Clamp to valid range
            const s = Math.max(0, Math.min(start, docLength));
            const e = Math.max(0, Math.min(end, docLength));
            // Only include if valid
            return s < e ? EditorSelection.range(s, e) : null;
          })
          .filter(Boolean);
        if (selections.length) {
          const rangesKey = JSON.stringify(ranges);
          this.view.dispatch({
            selection: EditorSelection.create(selections),
            scrollIntoView: true,
            effects: [setAppliedRangesEffect.of(rangesKey)],
          });
        }
      };

      update() {
        if (hlRanges && this.view.state.doc.length > 0) {
          const currentRangesKey = JSON.stringify(hlRanges);
          const appliedRanges = this.view.state.field(appliedRangesField);

          // Only apply ranges if they haven't been applied yet
          if (appliedRanges !== currentRangesKey) {
            requestAnimationFrame(() => {
              this.handleSelectRanges(hlRanges);
            });
          }
        }
      }

      destroy() {}
    }
  );

const RANGE_KEY = "hlRanges";
export function rangesToSearchParams(ranges: [start: number, end: number][], meta?: Record<string, unknown>): string {
  const params = new URLSearchParams();
  params.set(RANGE_KEY, JSON.stringify(ranges));
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      params.set(key, JSON.stringify(value));
    }
  }
  return params.toString();
}

export function parseParamsToRanges(params: URLSearchParams): {
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
export function getHighlightRangesFromURL(
  windowHref: string,
  type: "hash" | "search" = "hash"
): [start: number, end: number][] | null {
  const url = new URL(windowHref);
  const params = type === "hash" ? new URLSearchParams(url.hash.slice(1)) : url.searchParams;
  return parseParamsToRanges(params).ranges;
}
