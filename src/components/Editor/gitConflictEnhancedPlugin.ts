import { Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin } from "@codemirror/view";
import { createConflictWidget } from "./gitConflictEmbeddedEditor";
import { ConflictRegion, parseConflictMarkers } from "./gitConflictPlugin";

// State effects for managing conflicts with embedded editors
const setConflictRegions = StateEffect.define<ConflictRegion[]>();
const updateConflictContent = StateEffect.define<{
  regionId: string;
  contentType: "current" | "incoming";
  newContent: string;
}>();

// Enhanced state field that tracks both regions and their edited content
const enhancedConflictRegionsField = StateField.define<{
  regions: ConflictRegion[];
  editedContent: Map<string, { current: string; incoming: string }>;
}>({
  create: () => ({
    regions: [],
    editedContent: new Map(),
  }),
  update: (state, tr) => {
    let newState = state;

    for (const effect of tr.effects) {
      if (effect.is(setConflictRegions)) {
        newState = {
          ...newState,
          regions: effect.value,
        };
      }

      if (effect.is(updateConflictContent)) {
        const { regionId, contentType, newContent } = effect.value;
        const editedContent = new Map(newState.editedContent);
        const existing = editedContent.get(regionId) || { current: "", incoming: "" };
        editedContent.set(regionId, {
          ...existing,
          [contentType]: newContent,
        });

        newState = {
          ...newState,
          editedContent,
        };
      }
    }

    return newState;
  },
});

// Create decorations that hide conflict markers and content, showing only embedded editors
function createEnhancedConflictDecorations(
  view: EditorView,
  regions: ConflictRegion[],
  getLanguageExtension: (mimeType: string) => Extension | null
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  // Sort regions by start position first to ensure proper order
  const sortedRegions = [...regions].sort((a, b) => a.startMarker.from - b.startMarker.from);

  sortedRegions.forEach((region) => {
    if (region.resolved) return;

    // Validate positions are in correct order
    const positions = [
      region.startMarker.from,
      region.currentContent.from,
      region.currentContent.to,
      region.separatorMarker.from,
      region.incomingContent.from,
      region.incomingContent.to,
      region.endMarker.from,
      region.endMarker.to,
    ];

    // // Debug: log positions to see if they're valid
    // console.log('Conflict region positions:', positions);

    // Only add decorations if positions are valid and sorted
    const isValid = positions.every((pos, i) => i === 0 || pos >= positions[i - 1]!);
    if (!isValid) {
      console.warn("Invalid conflict region positions, skipping decoration");
      return;
    }

    try {
      // Collect all decorations with their positions for sorting
      const decorations = [];

      // Add widget at the start
      decorations.push({
        from: region.startMarker.from,
        to: region.startMarker.from,
        decoration: Decoration.widget({
          widget: createConflictWidget(
            region,
            (regionId, choice) => resolveEnhancedConflict(view, regionId, choice),
            (regionId, contentType, newContent) => {
              view.dispatch({
                effects: [updateConflictContent.of({ regionId, contentType, newContent })],
              });
            },
            getLanguageExtension,
            false // Use simple resolver
          ),
          side: 1,
        })
      });

      // Add start marker decoration
      decorations.push({
        from: region.startMarker.from,
        to: region.startMarker.to,
        decoration: Decoration.mark({
          class: "conflict-marker conflict-start",
        })
      });

      // Add current content decoration if there's content
      if (region.currentContent.from < region.currentContent.to) {
        decorations.push({
          from: region.currentContent.from,
          to: region.currentContent.to,
          decoration: Decoration.mark({
            class: "conflict-content conflict-current",
          })
        });
      }

      // Add separator marker decoration
      decorations.push({
        from: region.separatorMarker.from,
        to: region.separatorMarker.to,
        decoration: Decoration.mark({
          class: "conflict-marker conflict-separator",
        })
      });

      // Add incoming content decoration if there's content
      if (region.incomingContent.from < region.incomingContent.to) {
        decorations.push({
          from: region.incomingContent.from,
          to: region.incomingContent.to,
          decoration: Decoration.mark({
            class: "conflict-content conflict-incoming",
          })
        });
      }

      // Add end marker decoration
      decorations.push({
        from: region.endMarker.from,
        to: region.endMarker.to,
        decoration: Decoration.mark({
          class: "conflict-marker conflict-end",
        })
      });

      // Sort decorations by position and add them in order
      decorations
        .sort((a, b) => a.from - b.from || a.to - b.to)
        .forEach(({ from, to, decoration }) => {
          builder.add(from, to, decoration);
        });
    } catch (error) {
      console.warn("Failed to add conflict decorations:", error);
    }
  });

  return builder.finish();
}

// Enhanced conflict resolution that uses edited content from embedded editors
function resolveEnhancedConflict(
  view: EditorView,
  regionId: string,
  choice: "current" | "incoming" | "both" | "custom"
) {
  const state = view.state.field(enhancedConflictRegionsField);
  const region = state.regions.find((r) => r.id === regionId);

  if (!region) return;

  // Get the edited content from embedded editors (or fall back to original)
  const editedContent = state.editedContent.get(regionId);
  const currentContent = editedContent?.current || region.currentContent.text;
  const incomingContent = editedContent?.incoming || region.incomingContent.text;

  let replacement = "";
  switch (choice) {
    case "current":
      replacement = currentContent;
      break;
    case "incoming":
      replacement = incomingContent;
      break;
    case "both":
      replacement = currentContent + "\n" + incomingContent;
      break;
    case "custom":
      // For custom, use both edited contents combined
      replacement = currentContent + "\n" + incomingContent;
      break;
  }

  // Replace the entire conflict region (including markers) with the chosen content
  const from = region.startMarker.from;
  const to = region.endMarker.to;

  view.dispatch({
    changes: { from, to, insert: replacement },
    effects: [setConflictRegions.of(state.regions.map((r) => (r.id === regionId ? { ...r, resolved: true } : r)))],
  });
}

// Enhanced view plugin that manages conflict decorations with embedded editors
const enhancedConflictDecorationPlugin = (getLanguageExtension: (mimeType: string) => Extension | null) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: any) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.state.field(enhancedConflictRegionsField) !== update.startState.field(enhancedConflictRegionsField)
        ) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const state = view.state.field(enhancedConflictRegionsField);
        return createEnhancedConflictDecorations(view, state.regions, getLanguageExtension);
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );

// Enhanced conflict detection plugin
const enhancedConflictDetectionPlugin = ViewPlugin.fromClass(
  class {
    private updateTimeout: number | null = null;

    constructor(view: EditorView) {
      this.scheduleUpdate(view);
    }

    update(update: any) {
      if (update.docChanged) {
        this.scheduleUpdate(update.view);
      }
    }

    scheduleUpdate(view: EditorView) {
      // Cancel any pending update
      if (this.updateTimeout !== null) {
        cancelAnimationFrame(this.updateTimeout);
      }

      // Schedule update for next frame to avoid update conflicts
      this.updateTimeout = requestAnimationFrame(() => {
        this.updateTimeout = null;
        this.updateConflicts(view);
      });
    }

    updateConflicts(view: EditorView) {
      try {
        const doc = view.state.doc.toString();
        const regions = parseConflictMarkers(doc);

        view.dispatch({
          effects: [setConflictRegions.of(regions)],
        });
      } catch (error) {
        // Silently ignore if view is being destroyed or in an invalid state
        console.debug("Failed to update conflicts:", error);
      }
    }

    destroy() {
      if (this.updateTimeout !== null) {
        cancelAnimationFrame(this.updateTimeout);
        this.updateTimeout = null;
      }
    }
  }
);

// Enhanced CSS theme for conflict styling - using theme variables with proper specificity
const enhancedConflictTheme = EditorView.theme({
  "&.cm-editor .conflict-marker": {
    backgroundColor: "var(--destructive) !important",
    color: "var(--destructive-foreground) !important",
    fontWeight: "bold !important",
    padding: "2px 4px !important",
    borderRadius: "3px !important",
    margin: "2px 0 !important",
  },

  "&.cm-editor .conflict-start": {
    backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent) !important",
    borderLeft: "3px solid var(--primary) !important",
  },

  "&.cm-editor .conflict-separator": {
    backgroundColor: "color-mix(in srgb, var(--muted-foreground) 20%, transparent) !important",
    borderLeft: "3px solid var(--muted-foreground) !important",
  },

  "&.cm-editor .conflict-end": {
    backgroundColor: "color-mix(in srgb, var(--chart-3) 20%, transparent) !important",
    borderLeft: "3px solid var(--chart-3) !important",
  },

  "&.cm-editor .conflict-content": {
    padding: "2px 4px !important",
    borderRadius: "2px !important",
    margin: "1px 0 !important",
  },

  "&.cm-editor .conflict-current": {
    backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent) !important",
    borderLeft: "2px solid var(--primary) !important",
  },

  "&.cm-editor .conflict-incoming": {
    backgroundColor: "color-mix(in srgb, var(--chart-3) 10%, transparent) !important",
    borderLeft: "2px solid var(--chart-3) !important",
  },

  "&.cm-editor .conflict-resolver-widget": {
    margin: "8px 0 !important",
    padding: "8px !important",
    backgroundColor: "var(--card) !important",
    border: "1px solid var(--border) !important",
    borderRadius: "4px !important",
  },
});

// Main enhanced git conflict plugin export
export function gitConflictEnhancedPlugin(
  getLanguageExtension: (mimeType: string) => Extension | null = () => null
): Extension {
  return [
    enhancedConflictRegionsField,
    enhancedConflictDetectionPlugin,
    enhancedConflictDecorationPlugin(getLanguageExtension),
    enhancedConflictTheme,
  ];
}

// Export utilities for external use
export { enhancedConflictRegionsField, setConflictRegions, updateConflictContent };

// Utility function to get current conflict regions
export function getCurrentConflictRegions(view: EditorView): ConflictRegion[] {
  try {
    return view.state.field(enhancedConflictRegionsField).regions;
  } catch {
    // Field not present (plugin disabled)
    return [];
  }
}

// Utility function to check if document has conflicts
export function hasGitConflicts(view: EditorView): boolean {
  try {
    const regions = getCurrentConflictRegions(view);
    return regions.some((region) => !region.resolved);
  } catch {
    // Field not present (plugin disabled)
    return false;
  }
}
