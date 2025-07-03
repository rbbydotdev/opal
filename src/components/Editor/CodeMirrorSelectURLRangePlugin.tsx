import { EditorSelection, Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

const codeMirrorSelectURLRangePlugin = (hlRanges: [number, number][] | null) =>
  ViewPlugin.fromClass(
    class {
      private view: EditorView;
      private didSetSelection = false;

      constructor(view: EditorView) {
        this.view = view;
      }

      private handleSelectRanges = (ranges: [number, number][]) => {
        if (!ranges.length) return;
        const docLength = this.view.state.doc.length;
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
          this.view.dispatch({
            selection: EditorSelection.create(selections),
            scrollIntoView: true,
          });
        }
      };

      update(update: ViewUpdate) {
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

export function rangesToSearchParams(ranges: [number, number][], meta?: Record<string, unknown>): string {
  const params = new URLSearchParams();
  params.set(RANGE_KEY, JSON.stringify(ranges));
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      params.set(key, JSON.stringify(value));
    }
  }
  return params.toString();
}

function getRangesFromURL(windowHref: string, type: "hash" | "search" = "hash"): [start: number, end: number][] | null {
  const params =
    type === "hash" ? new URLSearchParams(new URL(windowHref).hash.slice(1)) : new URL(windowHref).searchParams;
  let ranges: Array<[string, string]> | null = null;
  try {
    const parsed = JSON.parse(params.get(RANGE_KEY) ?? "");
    if (Array.isArray(parsed)) {
      ranges = parsed as Array<[string, string]>;
      return ranges.map(([s, e]) => [parseInt(s), parseInt(e)]);
    }
  } catch (_e) {
    // console.log(params);
  }
  return null;
}
