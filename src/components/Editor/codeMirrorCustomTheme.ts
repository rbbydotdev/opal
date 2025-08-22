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
      borderLeftColor: "var(--foreground)" 
    },
    
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "var(--accent)",
    },

    ".cm-panels": { 
      backgroundColor: "var(--muted)", 
      color: "var(--muted-foreground)" 
    },
    ".cm-panels.cm-panels-top": { 
      borderBottom: "2px solid var(--border)" 
    },
    ".cm-panels.cm-panels-bottom": { 
      borderTop: "2px solid var(--border)" 
    },

    ".cm-searchMatch": {
      backgroundColor: "var(--search-highlight-bg)",
      outline: `1px solid var(--border)`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "var(--search-match-hover)",
    },

    ".cm-activeLine": { 
      backgroundColor: "var(--muted)" 
    },
    ".cm-selectionMatch": { 
      backgroundColor: "var(--secondary)" 
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

/// The highlighting style for code that uses CSS variables from our app theme.
export const customHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "var(--primary)" },
  {
    tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
    color: "var(--chart-2, var(--destructive))",
  },
  { tag: [t.variableName], color: "var(--chart-3, var(--foreground))" },
  { tag: [t.function(t.variableName)], color: "var(--primary)" },
  { tag: [t.labelName], color: "var(--chart-4, var(--secondary-foreground))" },
  {
    tag: [t.color, t.constant(t.name), t.standard(t.name)],
    color: "var(--primary)",
  },
  { tag: [t.definition(t.name), t.separator], color: "var(--chart-5, var(--accent-foreground))" },
  { tag: [t.brace], color: "var(--muted-foreground)" },
  {
    tag: [t.annotation],
    color: "var(--destructive)",
  },
  {
    tag: [t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
    color: "var(--chart-1, var(--primary))",
  },
  {
    tag: [t.typeName, t.className],
    color: "var(--chart-2, var(--destructive))",
  },
  {
    tag: [t.operator, t.operatorKeyword],
    color: "var(--foreground)",
  },
  {
    tag: [t.tagName],
    color: "var(--chart-3, var(--primary))",
  },
  {
    tag: [t.squareBracket],
    color: "var(--chart-4, var(--destructive))",
  },
  {
    tag: [t.angleBracket],
    color: "var(--chart-5, var(--destructive))",
  },
  {
    tag: [t.attributeName],
    color: "var(--chart-2, var(--destructive))",
  },
  {
    tag: [t.regexp],
    color: "var(--primary)",
  },
  {
    tag: [t.quote],
    color: "var(--muted-foreground)",
  },
  { tag: [t.string], color: "var(--chart-5, var(--chart-1))" },
  {
    tag: t.link,
    color: "var(--primary)",
    textDecoration: "underline",
    textUnderlinePosition: "under",
  },
  {
    tag: [t.url, t.escape, t.special(t.string)],
    color: "var(--chart-5, var(--chart-1))",
  },
  { tag: [t.meta], color: "var(--muted-foreground)" },
  { tag: [t.comment], color: "var(--muted-foreground)", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold", color: "var(--foreground)" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--foreground)" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.heading, fontWeight: "bold", color: "var(--primary)" },
  { tag: t.special(t.heading1), fontWeight: "bold", color: "var(--primary)" },
  { tag: t.heading1, fontWeight: "bold", color: "var(--primary)" },
  {
    tag: [t.heading2, t.heading3, t.heading4],
    fontWeight: "bold",
    color: "var(--primary)",
  },
  {
    tag: [t.heading5, t.heading6],
    color: "var(--primary)",
  },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "var(--chart-1, var(--primary))" },
  {
    tag: [t.processingInstruction, t.inserted],
    color: "var(--chart-5, var(--primary))",
  },
  {
    tag: [t.contentSeparator],
    color: "var(--chart-2, var(--destructive))",
  },
  { tag: t.invalid, color: "var(--destructive-foreground)", backgroundColor: "var(--destructive)" },
]);

/// Extension to enable the custom theme (both the editor theme and
/// the highlight style) that uses CSS variables from our app theme.
export const customCodeMirrorTheme: Extension = [customTheme, syntaxHighlighting(customHighlightStyle)];