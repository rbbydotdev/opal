import { EditorSelection, Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { checkSum } from "../../lib/checkSum";

const codeMirrorSelectURLRangePlugin = (hlRanges: [start: number, end: number, chsum?: number][] | null) =>
  ViewPlugin.fromClass(
    class {
      private view: EditorView;
      private didSetSelection = false;

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
              return null;
            }
            // Clamp to valid range
            const s = Math.max(0, Math.min(start, docLength));
            const e = Math.max(0, Math.min(end, docLength));
            // Only include if valid
            return s < e ? EditorSelection.range(s, e) : null;
          })
          .filter(Boolean);
        if (selections.length) {
          this.view.dispatch({
            selection: EditorSelection.create(selections),
            scrollIntoView: true,
          });
        }
      };

      update(_update: ViewUpdate) {
        if (!this.didSetSelection && hlRanges) {
          this.didSetSelection = true;
          requestAnimationFrame(() => {
            this.handleSelectRanges(hlRanges);
            // Wait for selection to be applied, then scroll
          });
        }
      }

      destroy() {}
    }
  );

export function CodeMirrorHighlightURLRange(): Extension {
  const hlRanges = getRangesFromURL(window.location.href, "search");
  return codeMirrorSelectURLRangePlugin(hlRanges);
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

function getRangesFromURL(
  windowHref: string,
  type: "hash" | "search" = "hash"
): [start: number, end: number, chsum?: number][] | null {
  const params =
    type === "hash" ? new URLSearchParams(new URL(windowHref).hash.slice(1)) : new URL(windowHref).searchParams;
  let ranges: Array<[startStr: string, endStr: string, chsum?: number]> | null = null;
  try {
    const rangeParam = params.get(RANGE_KEY);
    if (!rangeParam) return null;
    const parsed = JSON.parse(rangeParam);
    if (Array.isArray(parsed)) {
      ranges = parsed as Array<[startStr: string, endStr: string, chsum?: number]>;
      return ranges.map(([s, e, c]) => [parseInt(s), parseInt(e), c]);
    }
  } catch (_e) {
    console.warn(`Invalid range format in URL ${windowHref}`);
  }
  return null;
}
