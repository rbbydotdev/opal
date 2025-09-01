/* beware: vibe coded */
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/// The editor theme styles that use CSS variables from our app theme.
export const customTheme = EditorView.theme(
  {
    "&": {
      color: "var(--foreground)",
      backgroundColor: "var(--background)",
    },

    ".cm-content": {
      caretColor: "var(--foreground)",
    },

    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--foreground)",
    },

    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "var(--ring)",
      },

    ".cm-panels": {
      backgroundColor: "var(--muted)",
      color: "var(--muted-foreground)",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "2px solid var(--border)",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "2px solid var(--border)",
    },

    ".cm-searchMatch": {
      backgroundColor: "var(--search-highlight-bg)",
      outline: `1px solid var(--border)`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "var(--search-match-hover)",
    },

    ".cm-activeLine": {
      backgroundColor: "var(--muted)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "var(--secondary)",
    },

    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      outline: `1px solid var(--border)`,
    },

    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "var(--accent)",
    },

    ".cm-gutters": {
      backgroundColor: "var(--card)",
      color: "var(--card-foreground)",
      border: "none",
    },

    ".cm-activeLineGutter": {
      backgroundColor: "var(--muted)",
    },

    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--muted-foreground)",
    },

    ".cm-tooltip": {
      border: "1px solid var(--border)",
      backgroundColor: "var(--popover)",
      color: "var(--popover-foreground)",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "var(--popover)",
      borderBottomColor: "var(--popover)",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: "var(--accent)",
        color: "var(--accent-foreground)",
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
    { tag: t.keyword, color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})` },
    {
      tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
      color: `var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)})`,
    },
    { tag: [t.variableName], color: `var(${getContrastSafeColor("--chart-3", "--foreground", codeMirrorBackground)})` },
    {
      tag: [t.function(t.variableName)],
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.labelName],
      color: `var(${getContrastSafeColor("--chart-4", "--secondary-foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.color, t.constant(t.name), t.standard(t.name)],
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.definition(t.name), t.separator],
      color: `var(${getContrastSafeColor("--chart-5", "--accent-foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.brace],
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.annotation],
      color: `var(${getContrastSafeColor("--destructive", "--chart-2", codeMirrorBackground)})`,
    },
    {
      tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
      color: `var(${getContrastSafeColor("--chart-1", "--primary", codeMirrorBackground)})`,
    },
    {
      tag: [t.typeName, t.className],
      color: `var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)})`,
    },
    {
      tag: [t.operator, t.operatorKeyword],
      color: "var(--foreground)",
    },
    {
      tag: [t.tagName],
      color: `var(${getContrastSafeColor("--chart-3", "--primary", codeMirrorBackground)})`,
    },
    {
      tag: [t.squareBracket],
      color: `var(${getContrastSafeColor("--chart-4", "--destructive", codeMirrorBackground)})`,
    },
    {
      tag: [t.angleBracket],
      color: `var(${getContrastSafeColor("--chart-5", "--destructive", codeMirrorBackground)})`,
    },
    {
      tag: [t.attributeName],
      color: `var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)})`,
    },
    {
      tag: [t.regexp],
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.quote],
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
    },
    { tag: [t.string], color: `var(${getContrastSafeColor("--chart-5", "--chart-1", codeMirrorBackground)})` },
    {
      tag: t.link,
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
      textDecoration: "underline",
      textUnderlinePosition: "under",
    },
    {
      tag: [t.url, t.escape, t.special(t.string)],
      color: `var(${getContrastSafeColor("--chart-5", "--chart-1", codeMirrorBackground)})`,
    },
    {
      tag: [t.meta],
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.comment],
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
      fontStyle: "italic",
    },
    { tag: t.strong, fontWeight: "bold", color: "var(--foreground)" },
    { tag: t.emphasis, fontStyle: "italic", color: "var(--foreground)" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    {
      tag: t.heading,
      fontWeight: "bold",
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: t.special(t.heading1),
      fontWeight: "bold",
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: t.heading1,
      fontWeight: "bold",
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.heading2, t.heading3, t.heading4],
      fontWeight: "bold",
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.heading5, t.heading6],
      color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
    },
    {
      tag: [t.atom, t.bool, t.special(t.variableName)],
      color: `var(${getContrastSafeColor("--chart-1", "--primary", codeMirrorBackground)})`,
    },
    {
      tag: [t.processingInstruction, t.inserted],
      color: `var(${getContrastSafeColor("--chart-5", "--primary", codeMirrorBackground)})`,
    },
    {
      tag: [t.contentSeparator],
      color: `var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)})`,
    },
    { tag: t.invalid, color: "var(--destructive-foreground)", backgroundColor: "var(--destructive)" },
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
