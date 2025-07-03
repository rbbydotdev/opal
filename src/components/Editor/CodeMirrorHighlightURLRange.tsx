import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Cell } from "@mdxeditor/editor";

// Singleton instance (unchanged)
export const cmSelectionRanges$ = Cell<[start: number, end: number][]>([]);

function highlightRanges(ranges: [number, number][]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const [start, end] of ranges) {
    builder.add(start, end, Decoration.mark({ class: "cm-highlight-range" }));
  }
  return builder.finish();
}

const codeMirrorHighlightURLRangePlugin = () =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
        const ranges = getRangesFromURL(window.location.href);
        if (ranges) {
          setTimeout(() => this.handleHighlightRanges(ranges), 0);
        }
      }

      private handleHighlightRanges = (ranges: [number, number][]) => {
        this.decorations = highlightRanges(ranges);
        this.view.update([]);
      };

      update(update: ViewUpdate) {
        if (update.docChanged && this.decorations !== Decoration.none) {
          // Clear highlights on any document change
          this.decorations = Decoration.none;
          setTimeout(() => this.view.update([]), 0);
        }
      }

      destroy() {}

      static get decorations() {
        return (v: typeof EditorView) => v.decorations;
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

export function CodeMirrorHighlightURLRange(): Extension {
  return codeMirrorHighlightURLRangePlugin();
}
const RANGE_KEY = "hlRanges";

export function rangesToSearchParams(ranges: [number, number][], meta?: Record<string, object>): string {
  const params = new URLSearchParams();
  params.set(RANGE_KEY, JSON.stringify(ranges.map(([s, e]) => [s.toString(), e.toString()])));
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      params.set(key, JSON.stringify(value));
    }
  }
  return params.toString();
}

function getRangesFromURL(windowHref: string, type: "hash" | "params" = "hash"): [start: number, end: number][] | void {
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
    console.log(params);
  }
}
