/* beware: vibe coded */
import { getCSSVariableColor, hexToRgb, rgbToHex, oklchStringToRgb } from "@/lib/colorUtils";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { Extension } from "@codemirror/state";
import { styleTags, tags as t, Tag } from "@lezer/highlight";
import { MarkdownConfig } from "@lezer/markdown";

// Color contrast utilities
// const hexToRgb = (hex: string): [number, number, number] | null => {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
// };

const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
};

const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Adjust color brightness to improve contrast while preserving hue
const adjustColorForContrast = (color: string, backgroundColor: string, targetContrast: number = 3.0): string => {
  const colorRgb = hexToRgb(color);
  const bgRgb = hexToRgb(backgroundColor);

  if (!colorRgb || !bgRgb) return color;

  const currentContrast = getContrastRatio(color, backgroundColor);
  if (currentContrast >= targetContrast) return color;

  const bgLuminance = getLuminance(...bgRgb);
  const colorLuminance = getLuminance(...colorRgb);

  // For dark themes (low background luminance), be more aggressive
  const isDarkTheme = bgLuminance < 0.2;
  const adjustmentSteps = isDarkTheme ? [0.15, 0.3, 0.5, 0.7, 0.85] : [0.1, 0.2, 0.4, 0.6, 0.8];

  // Determine if we should make the color lighter or darker
  const shouldLighten = bgLuminance > colorLuminance;

  let [r, g, b] = colorRgb;
  let bestColor = color;
  let bestContrast = currentContrast;

  // Try adjusting brightness in steps
  for (const step of adjustmentSteps) {
    let adjustedR, adjustedG, adjustedB;

    if (shouldLighten) {
      // Lighten by mixing with white
      adjustedR = r + (255 - r) * step;
      adjustedG = g + (255 - g) * step;
      adjustedB = b + (255 - b) * step;
    } else {
      // Darken by reducing brightness
      adjustedR = r * (1 - step);
      adjustedG = g * (1 - step);
      adjustedB = b * (1 - step);
    }

    const adjustedColor = rgbToHex(adjustedR, adjustedG, adjustedB);
    const adjustedContrast = getContrastRatio(adjustedColor, backgroundColor);

    if (adjustedContrast >= targetContrast) {
      return adjustedColor;
    }

    if (adjustedContrast > bestContrast) {
      bestColor = adjustedColor;
      bestContrast = adjustedContrast;
    }
  }

  // If we still don't have good contrast, try more extreme adjustments for dark themes
  if (isDarkTheme && bestContrast < targetContrast) {
    // For dark themes, try pushing colors towards extremes
    if (shouldLighten) {
      // Try very light colors
      for (const intensity of [0.9, 0.95, 1.0]) {
        const adjustedR = r + (255 - r) * intensity;
        const adjustedG = g + (255 - g) * intensity;
        const adjustedB = b + (255 - b) * intensity;

        const adjustedColor = rgbToHex(adjustedR, adjustedG, adjustedB);
        const adjustedContrast = getContrastRatio(adjustedColor, backgroundColor);

        if (adjustedContrast >= targetContrast) {
          return adjustedColor;
        }

        if (adjustedContrast > bestContrast) {
          bestColor = adjustedColor;
          bestContrast = adjustedContrast;
        }
      }
    }
  }

  return bestColor;
};

// Smart color adjustment - preserves your colors but adjusts them for contrast when needed
export const getContrastSafeColor = (
  primaryVar: string,
  fallbackVar: string,
  cmBackgroundVar: string = "--background"
): string => {
  if (typeof window === "undefined") return primaryVar;

  try {
    // Get the CodeMirror editor background (this is what we need to check against)
    const cmBackgroundColor = getCSSVariableColor(cmBackgroundVar);
    const primaryColor = getCSSVariableColor(primaryVar);

    // Check if we have valid colors that we can adjust (hex or oklch)
    if ((primaryColor.startsWith("#") || primaryColor.startsWith("oklch(")) && 
        (cmBackgroundColor.startsWith("#") || cmBackgroundColor.startsWith("oklch("))) {
      // Detect dark themes and use higher contrast requirements
      const bgRgb = hexToRgb(cmBackgroundColor) || oklchStringToRgb(cmBackgroundColor);
      const isDarkTheme = bgRgb ? getLuminance(...bgRgb) < 0.2 : false;
      const targetContrast = isDarkTheme ? 3.5 : 2.8;

      const adjustedColor = adjustColorForContrast(primaryColor, cmBackgroundColor, targetContrast);

      // If we successfully adjusted the color, return it as a direct color value
      if (adjustedColor !== primaryColor) {
        return adjustedColor;
      }

      // If no adjustment was needed, use the original variable
      return primaryVar;
    }

    // For non-hex colors (rgb, hsl, etc.), assume they're designed to work together
    if (primaryColor.startsWith("rgb") || primaryColor.startsWith("hsl")) {
      return primaryVar;
    }

    // If we can't process the primary color, try the fallback
    const fallbackColor = getCSSVariableColor(fallbackVar);
    if ((fallbackColor.startsWith("#") || fallbackColor.startsWith("oklch(")) && 
        (cmBackgroundColor.startsWith("#") || cmBackgroundColor.startsWith("oklch("))) {
      const bgRgb = hexToRgb(cmBackgroundColor) || oklchStringToRgb(cmBackgroundColor);
      const isDarkTheme = bgRgb ? getLuminance(...bgRgb) < 0.2 : false;
      const targetContrast = isDarkTheme ? 3.5 : 2.8;

      const adjustedFallback = adjustColorForContrast(fallbackColor, cmBackgroundColor, targetContrast);
      if (adjustedFallback !== fallbackColor) {
        return adjustedFallback;
      }
      return fallbackVar;
    }

    // Last resort: return the fallback variable
    return fallbackVar;
  } catch {
    // On any error, use the original primary variable
    return primaryVar;
  }
};

// Define custom tags for markdown elements that aren't covered by default
const customTags = {
  // Heading marks (the # symbols)
  headingMark: Tag.define(),
  // Code block delimiters (```)
  codeBlockMark: Tag.define(),
  // Code fence info (language name after ```)
  codeFenceInfo: Tag.define(),
  // Inline code marks (backticks)
  inlineCodeMark: Tag.define(),
  // Link marks ([ ] ( ))
  linkMark: Tag.define(),
  // Image marks (!)
  imageMark: Tag.define(),
  // Quote marks (>)
  quoteMark: Tag.define(),
  // List markers (- * + 1.)
  listMark: Tag.define(),
  // Emphasis marks (* _ ** __)
  emphasisMark: Tag.define(),
  // HR marks (--- ***)
  hrMark: Tag.define(),
  // Table separators (|)
  tableMark: Tag.define(),
  // Strikethrough marks (~~)
  strikethroughMark: Tag.define(),
};

// Markdown configuration to apply custom styling tags
const markdownStylingExtension: MarkdownConfig = {
  props: [
    styleTags({
      // Heading marks
      HeadingMark: customTags.headingMark,
      "SetextHeading1/HeaderMark SetextHeading2/HeaderMark": customTags.headingMark,

      // Code block elements
      "FencedCode/CodeMark": customTags.codeBlockMark,
      "FencedCode/CodeInfo": customTags.codeFenceInfo,
      "InlineCode/CodeMark": customTags.inlineCodeMark,

      // Link elements
      "Link/LinkMark": customTags.linkMark,
      "Image/ImageMark": customTags.imageMark,

      // Blockquote
      "Blockquote/QuoteMark": customTags.quoteMark,

      // Lists
      "BulletList/ListMark OrderedList/ListMark": customTags.listMark,

      // Emphasis
      "Emphasis/EmphasisMark": customTags.emphasisMark,
      "StrongEmphasis/EmphasisMark": customTags.emphasisMark,

      // Horizontal rule
      HorizontalRule: customTags.hrMark,

      // Table
      "Table/TableDelimiter": customTags.tableMark,

      // Strikethrough
      "Strikethrough/StrikethroughMark": customTags.strikethroughMark,
    }),
  ],
};

// Create a smart highlighting style that adapts to contrast
const createContrastSafeHighlightStyle = () => {
  return HighlightStyle.define([
    // Heading marks (# ## ###)
    {
      tag: customTags.headingMark,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      fontWeight: "bold",
      opacity: "0.7",
    },

    // Headings content (with different sizes)
    {
      tag: t.heading1,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      fontWeight: "bold",
      fontSize: "1.5em",
    },
    {
      tag: t.heading2,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      fontWeight: "bold",
      fontSize: "1.3em",
    },
    {
      tag: t.heading3,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      fontWeight: "bold",
      fontSize: "1.2em",
    },
    {
      tag: [t.heading4, t.heading5, t.heading6],
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      fontWeight: "bold",
      fontSize: "1.1em",
    },

    // Code blocks and inline code
    {
      tag: customTags.codeBlockMark,
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground")})`,
      fontWeight: "bold",
    },
    {
      tag: customTags.codeFenceInfo,
      color: `var(${getContrastSafeColor("--chart-2", "--destructive")})`,
      fontStyle: "italic",
    },
    {
      tag: t.monospace,
      backgroundColor: "var(--muted)",
      color: `var(${getContrastSafeColor("--chart-5", "--chart-1", "--muted")})`,
      borderRadius: "4px",
      padding: "2px 4px",
    },
    {
      tag: customTags.inlineCodeMark,
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground")})`,
    },

    // Links and images
    {
      tag: customTags.linkMark,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      opacity: "0.7",
    },
    {
      tag: t.link,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      textDecoration: "underline",
      textUnderlinePosition: "under",
    },
    {
      tag: customTags.imageMark,
      color: `var(${getContrastSafeColor("--chart-3", "--primary")})`,
      fontWeight: "bold",
    },

    // Blockquote
    {
      tag: customTags.quoteMark,
      color: `var(${getContrastSafeColor("--chart-4", "--secondary-foreground")})`,
      fontWeight: "bold",
    },
    {
      tag: t.quote,
      color: `var(${getContrastSafeColor("--chart-4", "--secondary-foreground")})`,
      fontStyle: "italic",
      borderLeft: "4px solid var(--border)",
      paddingLeft: "1em",
    },

    // Lists
    {
      tag: customTags.listMark,
      color: `var(${getContrastSafeColor("--primary", "--foreground")})`,
      fontWeight: "bold",
    },

    // Emphasis and strong
    {
      tag: customTags.emphasisMark,
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground")})`,
      opacity: "0.7",
    },
    {
      tag: t.emphasis,
      fontStyle: "italic",
      color: "var(--foreground)",
    },
    {
      tag: t.strong,
      fontWeight: "bold",
      color: "var(--foreground)",
    },

    // Strikethrough
    {
      tag: customTags.strikethroughMark,
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground")})`,
    },
    {
      tag: t.strikethrough,
      textDecoration: "line-through",
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground")})`,
    },

    // Horizontal rule
    {
      tag: customTags.hrMark,
      color: `var(${getContrastSafeColor("--border", "--foreground")})`,
      fontWeight: "bold",
    },

    // Tables
    {
      tag: customTags.tableMark,
      color: `var(${getContrastSafeColor("--border", "--foreground")})`,
      fontWeight: "bold",
    },

    // URL content
    {
      tag: [t.url, t.escape],
      color: `var(${getContrastSafeColor("--chart-5", "--chart-1")})`,
    },

    // Meta information (like HTML attributes)
    {
      tag: t.meta,
      color: `var(${getContrastSafeColor("--muted-foreground", "--foreground")})`,
    },

    // Processing instructions
    {
      tag: t.processingInstruction,
      color: `var(${getContrastSafeColor("--chart-2", "--destructive")})`,
    },
  ]);
};

// Export the contrast-safe highlight style
const markdownHighlightStyle = createContrastSafeHighlightStyle();

// Enhanced markdown extension with comprehensive highlighting
export const enhancedMarkdownExtension = (
  withFrontmatter: boolean = true,
  codeMirrorBackground: string = "--background"
): Extension => {
  const markdownExt = markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    extensions: [markdownStylingExtension],
  });

  // Create contrast-safe highlighting style with specific CodeMirror background
  const createThemeSpecificHighlightStyle = () => {
    return HighlightStyle.define([
      // Heading marks (# ## ###)
      {
        tag: customTags.headingMark,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
        opacity: "0.7",
      },

      // Headings content (with different sizes)
      {
        tag: t.heading1,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
        fontSize: "1.5em",
      },
      {
        tag: t.heading2,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
        fontSize: "1.3em",
      },
      {
        tag: t.heading3,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
        fontSize: "1.2em",
      },
      {
        tag: [t.heading4, t.heading5, t.heading6],
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
        fontSize: "1.1em",
      },

      // Code blocks and inline code
      {
        tag: customTags.codeBlockMark,
        color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
      },
      {
        tag: customTags.codeFenceInfo,
        color: `var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)})`,
        fontStyle: "italic",
      },
      {
        tag: t.monospace,
        backgroundColor: "var(--muted)",
        color: `var(${getContrastSafeColor("--chart-5", "--chart-1", "--muted")})`,
        borderRadius: "4px",
        padding: "2px 4px",
      },
      {
        tag: customTags.inlineCodeMark,
        color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
      },

      // Links and images
      {
        tag: customTags.linkMark,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        opacity: "0.7",
      },
      {
        tag: t.link,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        textDecoration: "underline",
        textUnderlinePosition: "under",
      },
      {
        tag: customTags.imageMark,
        color: `var(${getContrastSafeColor("--chart-3", "--primary", codeMirrorBackground)})`,
        fontWeight: "bold",
      },

      // Blockquote
      {
        tag: customTags.quoteMark,
        color: `var(${getContrastSafeColor("--chart-4", "--secondary-foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
      },
      {
        tag: t.quote,
        color: `var(${getContrastSafeColor("--chart-4", "--secondary-foreground", codeMirrorBackground)})`,
        fontStyle: "italic",
        borderLeft: "4px solid var(--border)",
        paddingLeft: "1em",
      },

      // Lists
      {
        tag: customTags.listMark,
        color: `var(${getContrastSafeColor("--primary", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
      },

      // Emphasis and strong
      {
        tag: customTags.emphasisMark,
        color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
        opacity: "0.7",
      },
      {
        tag: t.emphasis,
        fontStyle: "italic",
        color: "var(--foreground)",
      },
      {
        tag: t.strong,
        fontWeight: "bold",
        color: "var(--foreground)",
      },

      // Strikethrough
      {
        tag: customTags.strikethroughMark,
        color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
      },
      {
        tag: t.strikethrough,
        textDecoration: "line-through",
        color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
      },

      // Horizontal rule
      {
        tag: customTags.hrMark,
        color: `var(${getContrastSafeColor("--border", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
      },

      // Tables
      {
        tag: customTags.tableMark,
        color: `var(${getContrastSafeColor("--border", "--foreground", codeMirrorBackground)})`,
        fontWeight: "bold",
      },

      // URL content
      {
        tag: [t.url, t.escape],
        color: `var(${getContrastSafeColor("--chart-5", "--chart-1", codeMirrorBackground)})`,
      },

      // Meta information (like HTML attributes)
      {
        tag: t.meta,
        color: `var(${getContrastSafeColor("--muted-foreground", "--foreground", codeMirrorBackground)})`,
      },

      // Processing instructions
      {
        tag: t.processingInstruction,
        color: `var(${getContrastSafeColor("--chart-2", "--destructive", codeMirrorBackground)})`,
      },
    ]);
  };

  const extensions: Extension[] = [syntaxHighlighting(createThemeSpecificHighlightStyle())];

  if (withFrontmatter) {
    extensions.push(
      yamlFrontmatter({
        content: markdownExt,
      })
    );
  } else {
    extensions.push(markdownExt);
  }

  return extensions;
};

// Debug utility to check color contrast for a given theme
const debugContrastRatios = (codeMirrorBackground: string = "--background") => {
  if (typeof window === "undefined") {
    console.log("Contrast debugging only available in browser");
    return;
  }

  const bgColor = getCSSVariableColor(codeMirrorBackground);
  const colors = [
    { name: "primary", var: "--primary" },
    { name: "foreground", var: "--foreground" },
    { name: "muted-foreground", var: "--muted-foreground" },
    { name: "chart-1", var: "--chart-1" },
    { name: "chart-2", var: "--chart-2" },
    { name: "chart-3", var: "--chart-3" },
    { name: "chart-4", var: "--chart-4" },
    { name: "chart-5", var: "--chart-5" },
    { name: "destructive", var: "--destructive" },
    { name: "border", var: "--border" },
  ];

  console.log(`\n🎨 CodeMirror Contrast Analysis (Background: ${bgColor})`);
  console.log("=".repeat(60));

  colors.forEach(({ name, var: cssVar }) => {
    const color = getCSSVariableColor(cssVar);
    if ((color.startsWith("#") || color.startsWith("oklch(")) && 
        (bgColor.startsWith("#") || bgColor.startsWith("oklch("))) {
      const contrast = getContrastRatio(color, bgColor);
      const adjustedColor = adjustColorForContrast(color, bgColor, 2.8);
      const adjustedContrast = getContrastRatio(adjustedColor, bgColor);

      const status = contrast >= 2.8 ? "✅ OK" : "⚠️  Low";
      const adjustment = adjustedColor !== color ? ` → ${adjustedColor} (${adjustedContrast.toFixed(2)}:1)` : "";

      console.log(`${name.padEnd(16)} ${color} ${contrast.toFixed(2)}:1 ${status}${adjustment}`);
    } else {
      console.log(`${name.padEnd(16)} ${color} → Non-hex color (assumed OK)`);
    }
  });

  console.log("\n📝 Legend:");
  console.log("✅ OK     = 2.8:1+ (good contrast for syntax highlighting)");
  console.log("⚠️  Low    = <2.8:1 (will be automatically adjusted)");
  console.log("Adjusted colors are shown with → new_color (new_ratio)");
};
