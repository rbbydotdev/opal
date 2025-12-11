import { Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";

// // Git conflict marker patterns
// const CONFLICT_START_PATTERN = /^<{7}(?:\s+(.*))?$/gm;
// const CONFLICT_SEPARATOR_PATTERN = /^={7}$/gm;
// const CONFLICT_END_PATTERN = /^>{7}(?:\s+(.*))?$/gm;

interface ConflictSection {
  type: "start" | "separator" | "end";
  from: number;
  to: number;
  line: number;
  label?: string;
}

export interface ConflictRegion {
  id: string;
  startMarker: ConflictSection;
  separatorMarker: ConflictSection;
  endMarker: ConflictSection;
  currentContent: {
    from: number;
    to: number;
    text: string;
  };
  incomingContent: {
    from: number;
    to: number;
    text: string;
  };
  resolved?: boolean;
}

// State effect to update conflict regions
const setConflictRegions = StateEffect.define<ConflictRegion[]>();

// State field to track conflict regions
const conflictRegionsField = StateField.define<ConflictRegion[]>({
  create: () => [],
  update: (regions, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setConflictRegions)) {
        return effect.value;
      }
    }
    return regions;
  },
});

// Parse conflict markers from document
export function parseConflictMarkers(doc: string): ConflictRegion[] {
  const regions: ConflictRegion[] = [];
  const lines = doc.split("\n");

  let currentRegion: Partial<ConflictRegion> | null = null;
  let position = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineStart = position;
    const lineEnd = position + line.length;

    // Check for conflict start
    const startMatch = line.match(/^<{7}(?:\s+(.*))?$/);
    if (startMatch) {
      currentRegion = {
        id: `conflict-${Date.now()}-${i}`,
        startMarker: {
          type: "start",
          from: lineStart,
          to: lineEnd,
          line: i,
          label: startMatch[1] || "HEAD",
        },
      };
    }

    // Check for conflict separator
    const separatorMatch = line.match(/^={7}$/);
    if (separatorMatch && currentRegion) {
      currentRegion.separatorMarker = {
        type: "separator",
        from: lineStart,
        to: lineEnd,
        line: i,
      };

      // Calculate current content (between start and separator)
      const startLine = currentRegion.startMarker?.line;
      if (startLine !== undefined) {
        const currentContentStart = lines.slice(0, startLine + 1).join("\n").length + 1;
        const currentContentEnd = Math.max(currentContentStart, lineStart - 1);

        currentRegion.currentContent = {
          from: currentContentStart,
          to: currentContentEnd,
          text: currentContentStart <= currentContentEnd ? doc.slice(currentContentStart, currentContentEnd) : "",
        };
      }
    }

    // Check for conflict end
    const endMatch = line.match(/^>{7}(?:\s+(.*))?$/);
    if (endMatch && currentRegion && currentRegion.separatorMarker) {
      currentRegion.endMarker = {
        type: "end",
        from: lineStart,
        to: lineEnd,
        line: i,
        label: endMatch[1] || "incoming",
      };

      // Calculate incoming content (between separator and end)
      const separatorLine = currentRegion.separatorMarker?.line;
      if (separatorLine !== undefined) {
        const incomingContentStart = lines.slice(0, separatorLine + 1).join("\n").length + 1;
        const incomingContentEnd = Math.max(incomingContentStart, lineStart - 1);

        currentRegion.incomingContent = {
          from: incomingContentStart,
          to: incomingContentEnd,
          text: incomingContentStart <= incomingContentEnd ? doc.slice(incomingContentStart, incomingContentEnd) : "",
        };
      }

      // Only add if we have all required parts
      if (
        currentRegion.startMarker &&
        currentRegion.separatorMarker &&
        currentRegion.endMarker &&
        currentRegion.currentContent &&
        currentRegion.incomingContent
      ) {
        regions.push(currentRegion as ConflictRegion);
      }
      currentRegion = null;
    }

    position = lineEnd + 1; // +1 for newline
  }

  return regions;
}

// Widget for conflict resolution buttons
class ConflictResolverWidget extends WidgetType {
  constructor(
    private region: ConflictRegion,
    private onResolve: (regionId: string, choice: "current" | "incoming" | "both") => void
  ) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "conflict-resolver-widget";
    container.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin: 4px 0;
      font-size: 12px;
    `;

    const label = document.createElement("span");
    label.textContent = "Resolve conflict:";
    label.style.color = "var(--muted-foreground)";

    const currentBtn = this.createButton("Accept Current", "current");
    const incomingBtn = this.createButton("Accept Incoming", "incoming");
    const bothBtn = this.createButton("Accept Both", "both");

    container.append(label, currentBtn, incomingBtn, bothBtn);
    return container;
  }

  private createButton(text: string, choice: "current" | "incoming" | "both") {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
      padding: 4px 8px;
      background: var(--primary);
      color: var(--primary-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    `;

    button.addEventListener("click", (e) => {
      e.preventDefault();
      this.onResolve(this.region.id, choice);
    });

    return button;
  }

  eq(other: ConflictResolverWidget) {
    return this.region.id === other.region.id;
  }
}

// Create decorations for conflict regions
function createConflictDecorations(view: EditorView, regions: ConflictRegion[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  regions.forEach((region) => {
    if (region.resolved) return;

    // Decorate conflict markers
    builder.add(
      region.startMarker.from,
      region.startMarker.to,
      Decoration.line({ class: "conflict-marker conflict-start" })
    );

    builder.add(
      region.separatorMarker.from,
      region.separatorMarker.to,
      Decoration.line({ class: "conflict-marker conflict-separator" })
    );

    builder.add(region.endMarker.from, region.endMarker.to, Decoration.line({ class: "conflict-marker conflict-end" }));

    // Decorate content sections (only if there's actual content)
    if (region.currentContent.from < region.currentContent.to) {
      builder.add(
        region.currentContent.from,
        region.currentContent.to,
        Decoration.mark({ class: "conflict-content conflict-current" })
      );
    }

    if (region.incomingContent.from < region.incomingContent.to) {
      builder.add(
        region.incomingContent.from,
        region.incomingContent.to,
        Decoration.mark({ class: "conflict-content conflict-incoming" })
      );
    }

    // Add resolution widget after the conflict region
    const resolverWidget = Decoration.widget({
      widget: new ConflictResolverWidget(region, (regionId, choice) => {
        resolveConflict(view, regionId, choice);
      }),
      side: 1,
      block: true,
    });

    builder.add(region.endMarker.to, region.endMarker.to, resolverWidget);
  });

  return builder.finish();
}

// Resolve a conflict by replacing the conflict region with the chosen content
function resolveConflict(view: EditorView, regionId: string, choice: "current" | "incoming" | "both") {
  const regions = view.state.field(conflictRegionsField);
  const region = regions.find((r) => r.id === regionId);

  if (!region) return;

  let replacement = "";
  switch (choice) {
    case "current":
      replacement = region.currentContent.text;
      break;
    case "incoming":
      replacement = region.incomingContent.text;
      break;
    case "both":
      replacement = region.currentContent.text + "\n" + region.incomingContent.text;
      break;
  }

  // Replace the entire conflict region (including markers) with the chosen content
  const from = region.startMarker.from;
  const to = region.endMarker.to;

  view.dispatch({
    changes: { from, to, insert: replacement },
    effects: [setConflictRegions.of(regions.map((r) => (r.id === regionId ? { ...r, resolved: true } : r)))],
  });
}

// View plugin to manage conflict decorations
const conflictDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const regions = view.state.field(conflictRegionsField);
      return createConflictDecorations(view, regions);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Plugin to detect and parse conflicts on document changes
const conflictDetectionPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.updateConflicts(view);
    }

    update(update: any) {
      if (update.docChanged) {
        this.updateConflicts(update.view);
      }
    }

    updateConflicts(view: EditorView) {
      const doc = view.state.doc.toString();
      const regions = parseConflictMarkers(doc);

      view.dispatch({
        effects: [setConflictRegions.of(regions)],
      });
    }
  }
);

// CSS theme for conflict styling
const conflictTheme = EditorView.theme({
  ".conflict-marker": {
    backgroundColor: "var(--destructive) !important",
    color: "var(--destructive-foreground) !important",
    fontWeight: "bold",
    padding: "2px 4px",
    borderRadius: "3px",
  },

  ".conflict-start": {
    backgroundColor: "rgba(var(--chart-2), 0.2) !important",
    borderLeft: "3px solid var(--chart-2) !important",
  },

  ".conflict-separator": {
    backgroundColor: "rgba(var(--muted-foreground), 0.2)",
    borderLeft: "3px solid var(--muted-foreground)",
  },

  ".conflict-end": {
    backgroundColor: "rgba(var(--chart-3), 0.2)",
    borderLeft: "3px solid var(--chart-3)",
  },

  ".conflict-content": {
    padding: "1px 2px",
    borderRadius: "2px",
  },

  ".conflict-current": {
    backgroundColor: "rgba(var(--chart-2), 0.1)",
    borderLeft: "2px solid var(--chart-2)",
  },

  ".conflict-incoming": {
    backgroundColor: "rgba(var(--chart-3), 0.1)",
    borderLeft: "2px solid var(--chart-3)",
  },

  ".conflict-resolver-widget": {
    margin: "8px 0 !important",
  },
});

// Main git conflict plugin export
function gitConflictPlugin(): Extension {
  return [conflictRegionsField, conflictDetectionPlugin, conflictDecorationPlugin, conflictTheme];
}
