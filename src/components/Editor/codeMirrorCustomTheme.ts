/* beware: vibe coded */
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/// The editor theme styles that use CSS variables from our app theme.
export const customTheme = EditorView.theme(
  {
    "&": {
      color: "oklch(var(--foreground))",
      backgroundColor: "oklch(var(--background))",
    },

    ".cm-content": {
      caretColor: "oklch(var(--foreground))",
    },

    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "oklch(var(--foreground))",
    },

    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "oklch(var(--ring))",
      },

    ".cm-panels": {
      backgroundColor: "oklch(var(--muted))",
      color: "oklch(var(--muted-foreground))",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "2px solid oklch(var(--border))",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "2px solid oklch(var(--border))",
    },

    ".cm-searchMatch": {
      backgroundColor: "oklch(var(--search-highlight-bg))",
      outline: `1px solid oklch(var(--border))`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "oklch(var(--search-match-hover))",
    },

    ".cm-activeLine": {
      backgroundColor: "oklch(var(--muted))",
    },
    ".cm-selectionMatch": {
      backgroundColor: "oklch(var(--secondary))",
    },

    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      outline: `1px solid oklch(var(--border))`,
    },

    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "oklch(var(--accent))",
    },

    ".cm-gutters": {
      backgroundColor: "oklch(var(--card))",
      color: "oklch(var(--card-foreground))",
      border: "none",
    },

    ".cm-activeLineGutter": {
      backgroundColor: "oklch(var(--muted))",
    },

    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "oklch(var(--muted-foreground))",
    },

    ".cm-tooltip": {
      border: "1px solid oklch(var(--border))",
      backgroundColor: "oklch(var(--popover))",
      color: "oklch(var(--popover-foreground))",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "oklch(var(--popover))",
      borderBottomColor: "oklch(var(--popover))",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: "oklch(var(--accent))",
        color: "oklch(var(--accent-foreground))",
      },
    },
  },
  { dark: false }
);

// Import contrast utilities from markdown highlighting
import { getContrastSafeColor } from "./markdownHighlighting";

// Create a contrast-safe version of the highlighting style
const createContrastSafeGeneralHighlightStyle = (codeMirrorBackground: string = "--background") => {
  return HighlightStyle.define([
    { tag: t.keyword, color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))` },
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: `oklch(var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)}))`,
    },
    {
      tag: [t.variableName],
      color: `oklch(var(${getContrastSafeColor("--chart-3", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.function(t.variableName)],
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.labelName],
      color: `oklch(var(${getContrastSafeColor("--chart-4", "--secondary-foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.color, t.constant(t.name), t.standard(t.name)],
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.definition(t.name), t.separator],
      color: `oklch(var(${getContrastSafeColor("--chart-5", "--accent-foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.brace],
      color: `oklch(var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.annotation],
      color: `oklch(var(${getContrastSafeColor("--destructive", "--chart-2", codeMirrorBackground)}))`,
    },
    {
      tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
      color: `oklch(var(${getContrastSafeColor("--chart-1", "--primary", codeMirrorBackground)}))`,
    },
    {
      tag: [t.typeName, t.className],
      color: `oklch(var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)}))`,
    },
    {
      tag: [t.operator, t.operatorKeyword],
      color: "oklch(var(--foreground))",
    },
    {
      tag: [t.tagName],
      color: `oklch(var(${getContrastSafeColor("--chart-3", "--primary", codeMirrorBackground)}))`,
    },
    {
      tag: [t.squareBracket],
      color: `oklch(var(${getContrastSafeColor("--chart-4", "--destructive", codeMirrorBackground)}))`,
    },
    {
      tag: [t.angleBracket],
      color: `oklch(var(${getContrastSafeColor("--chart-5", "--destructive", codeMirrorBackground)}))`,
    },
    {
      tag: [t.attributeName],
      color: `oklch(var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)}))`,
    },
    {
      tag: [t.regexp],
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.quote],
      color: `oklch(var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)}))`,
    },
    { tag: [t.string], color: `oklch(var(${getContrastSafeColor("--chart-5", "--chart-1", codeMirrorBackground)}))` },
    {
      tag: t.link,
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
      textDecoration: "underline",
      textUnderlinePosition: "under",
    },
    {
      tag: [t.url, t.escape, t.special(t.string)],
      color: `oklch(var(${getContrastSafeColor("--chart-5", "--chart-1", codeMirrorBackground)}))`,
    },
    {
      tag: [t.meta],
      color: `oklch(var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.comment],
      color: `oklch(var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)}))`,
      fontStyle: "italic",
    },
    { tag: t.strong, fontWeight: "bold", color: "oklch(var(--foreground))" },
    { tag: t.emphasis, fontStyle: "italic", color: "oklch(var(--foreground))" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    {
      tag: t.heading,
      fontWeight: "bold",
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: t.special(t.heading1),
      fontWeight: "bold",
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: t.heading1,
      fontWeight: "bold",
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.heading2, t.heading3, t.heading4],
      fontWeight: "bold",
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.heading5, t.heading6],
      color: `oklch(var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)}))`,
    },
    {
      tag: [t.atom, t.bool, t.special(t.variableName)],
      color: `oklch(var(${getContrastSafeColor("--chart-1", "--primary", codeMirrorBackground)}))`,
    },
    {
      tag: [t.processingInstruction, t.inserted],
      color: `oklch(var(${getContrastSafeColor("--chart-5", "--primary", codeMirrorBackground)}))`,
    },
    {
      tag: [t.contentSeparator],
      color: `oklch(var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)}))`,
    },
    { tag: t.invalid, color: "oklch(var(--destructive-foreground)", backgroundColor: "var(--destructive))" },
  ]);
};

/// The highlighting style for code that uses CSS variables from our app theme.
export const customHighlightStyle = createContrastSafeGeneralHighlightStyle();

/// Extension to enable the custom theme (both the editor theme and
/// the highlight style) that uses CSS variables from our app theme.
export const customCodeMirrorTheme: Extension = [customTheme, syntaxHighlighting(customHighlightStyle)];

/// Create a contrast-safe custom theme with a specific background variable
export const createContrastSafeCustomTheme = (codeMirrorBackground: string = "--background"): Extension => {
  return [customTheme, syntaxHighlighting(createContrastSafeGeneralHighlightStyle(codeMirrorBackground))];
};
