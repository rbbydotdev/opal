import { EditorSelection, Extension, StateEffect, StateField, Compartment } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { checkSum } from "../../lib/checkSum";

// Effect to mark ranges as applied
const setAppliedRangesEffect = StateEffect.define<string>();

// State field to track applied highlight ranges
const appliedRangesField = StateField.define<string | null>({
  create: () => null,
  update: (value, tr) => {
    const effect = tr.effects.find((e) => e.is(setAppliedRangesEffect));
    return effect ? effect.value : value;
  },
});

const codeMirrorSelectURLRangePlugin = (hlRanges: [start: number, end: number, chsum?: number][] | null) =>
  ViewPlugin.fromClass(
    class {
      private view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
      }

      private handleSelectRanges = (ranges: [start: number, end: number, chsum?: number][]) => {
        if (!ranges.length) return;
        const docLength = this.view.state.doc.length;
        if (!docLength) return;

        const selections = ranges
          .map(([start, end, chsumStr]) => {
            if (chsumStr && chsumStr !== checkSum(this.view.state.doc.slice(start, end).toString())) {
              console.warn(
                `chsum mismatch for highlight range [${start}, ${end}] got: ${chsumStr}, expected: ${checkSum(
                  this.view.state.doc.slice(start, end).toString()
                )}`
              );
            }
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

export function createURLRangeExtension(hlRanges: [start: number, end: number, chsum?: number][] | null): Extension {
  return [appliedRangesField, codeMirrorSelectURLRangePlugin(hlRanges)];
}

export function CodeMirrorHighlightURLRange(
  hlRanges = getHighlightRangesFromURL(window.location.href, "search")
): Extension {
  return createURLRangeExtension(hlRanges);
}

const RANGE_KEY = "hlRanges";
export function rangesToSearchParams(
  ranges: [start: number, end: number, chsum?: number][],
  meta?: Record<string, unknown>
): string {
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
  ranges: [start: number, end: number, chsum?: number][] | null;
  meta: Record<string, unknown>;
} {
  let ranges: Array<[startStr: string, endStr: string, chsum?: number]> | null = null;
  const meta: Record<string, unknown> = {};
  try {
    const rangeParam = params.get(RANGE_KEY);
    if (rangeParam) {
      const parsed = JSON.parse(rangeParam);
      if (Array.isArray(parsed)) {
        ranges = parsed as Array<[startStr: string, endStr: string, chsum?: number]>;
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
    ranges: ranges ? ranges.map(([s, e, c]) => [parseInt(s), parseInt(e), c]) : null,
    meta,
  };
}
export function getHighlightRangesFromURL(
  windowHref: string,
  type: "hash" | "search" = "hash"
): [start: number, end: number, chsum?: number][] | null {
  const url = new URL(windowHref);
  const params = type === "hash" ? new URLSearchParams(url.hash.slice(1)) : url.searchParams;
  return parseParamsToRanges(params).ranges;
}
