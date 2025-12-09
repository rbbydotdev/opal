/**
 * Standalone Shadcn Theme Library
 * Apply themes from registry.json to any root element
 * No dependencies - just import your registry.json
 */

import { invertColor } from "@/lib/colorUtils";

// Import registry.json and type it as ThemeRegistry
import { MDX_TREE_HIGHLIGHT_NAME } from "@/editor/highlightMdxElement";
import { MDX_FOCUS_SEARCH_NAME, MDX_SEARCH_NAME } from "@/editor/searchPlugin";
import { DEFAULT_THEME_STATE } from "@/features/theme/theme-constants";
import registryJson from "./themes.json";

export const registry: ThemeRegistry = registryJson as unknown as ThemeRegistry;
// Types - annotate your registry.json import with these
interface ThemeRegistry {
  items: ThemeRegistryItem[];
}

interface ThemeRegistryItem {
  name: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
    theme?: Record<string, string>;
  };
}

const ALL_VARS = new Set([
  "accent",
  "accent-foreground",
  "background",
  "border",
  "card",
  "card-foreground",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "destructive",
  "destructive-foreground",
  "font-mono",
  "font-sans",
  "font-serif",
  "foreground",
  "highlight",
  "highlight-focus",
  "highlight-focus-foreground",
  "highlight-foreground",
  "input",
  "letter-spacing",
  "muted",
  "muted-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "radius",
  "ring",
  "secondary",
  "secondary-foreground",
  "shadow",
  "shadow-2xl",
  "shadow-2xs",
  "shadow-blur",
  "shadow-color",
  "shadow-lg",
  "shadow-md",
  "shadow-offset-x",
  "shadow-offset-y",
  "shadow-opacity",
  "shadow-sm",
  "shadow-spread",
  "shadow-xl",
  "shadow-xs",
  "sidebar",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-background",
  "sidebar-border",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-ring",
  "spacing",
  "success",
  "success-foreground",
]);

interface ApplyThemeOptions {
  theme: string;
  mode: "light" | "dark";
  rootElement?: HTMLElement;
}

function themePrefersMode(theme: ThemeRegistryItem): "light" | "dark" {
  //check which mode has the most variables defined
  if (theme.name.includes("light")) {
    return "light";
  }
  if (theme.name.includes("dark")) {
    return "dark";
  }
  const lightCount = Object.keys(theme.cssVars.light || {}).length;
  const darkCount = Object.keys(theme.cssVars.dark || {}).length;
  const themeCount = Object.keys(theme.cssVars.theme || {}).length;
  return lightCount >= darkCount && lightCount >= themeCount ? "light" : "dark";
}
export function getThemeModePrefers(themeName: string): "light" | "dark" | null {
  const themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    logger.warn(`Theme "${themeName}" not found in registry`);
    return null;
  }
  return themePrefersMode(themeItem);
}

export function applyTheme(options: ApplyThemeOptions): void {
  const { theme: themeName } = options;

  const defaultTheme = registry.items.find((item) => item.name === DEFAULT_THEME_STATE.themeName);
  let themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    logger.warn(`Theme "${themeName}" not found in registry`);
    themeItem = defaultTheme;
    if (!themeItem) {
      logger.warn(`Theme ${DEFAULT_THEME_STATE.themeName} not found in registry`);
      return;
    }
  }

  // Remove any old theme style tag
  const oldStyle = document.getElementById("theme-style");
  if (oldStyle) oldStyle.remove();

  // varObject
  // Build CSS for light and dark
  const buildVarObj = (mode: "light" | "dark") => {
    const vars: Record<string, string> = {};
    for (const key of ALL_VARS) {
      vars[key] =
        themeItem!.cssVars[mode]?.[key] ??
        themeItem!.cssVars.theme?.[key] ??
        invertColor(themeItem!.cssVars[mode === "light" ? "dark" : "light"]?.[key] ?? "") ??
        invertColor(themeItem!.cssVars[mode]?.[key]!) ??
        "";
    }
    return vars;
  };
  const buildVars = (mode: "light" | "dark") => {
    const vars: string[] = [];
    const varObj = buildVarObj(mode);
    // General healer for any base + -foreground / -background pair
    const healAffixes = (vo: Record<string, string>, mode: "light" | "dark") => {
      const isHex = (v?: string) => !!v && /^#([0-9a-f]{3,8})$/i.test(v.trim());
      for (const key of Object.keys(vo)) {
        const match = key.match(/^(.*)-(foreground|background)$/);
        if (!match) continue;
        const base = match[1];
        if (!vo[base!]) continue;

        const current = vo[key];
        const baseVal = vo[base!];

        if (!current || current.toLowerCase() === (baseVal ?? "").toLowerCase()) {
          const inverted = isHex(baseVal) ? invertColor(baseVal ?? "") : "";
          vo[key] = inverted ? inverted : mode === "light" ? "1 0 0" : "0 0 0";
        }
      }
    };
    healAffixes(varObj, mode);
    for (const key of ALL_VARS) {
      if (varObj[key]) {
        vars.push(`--${key}: ${varObj[key]};`);
      }
    }

    return vars.join("\n");
  };

  const lightVars = buildVars("light");
  const darkVars = buildVars("dark");

  // Inject style tag
  const style = document.createElement("style");
  style.id = "theme-style";
  style.innerHTML = `
    :root {
      ${lightVars}
    }
    .dark {
      ${darkVars}
    }

    ::highlight(${MDX_SEARCH_NAME}) {
      background-color: oklch(var(--highlight) / 0.6) !important;
      color: oklch(var(--highlight-foreground) / 0.8) !important;
    }
    ::highlight(${MDX_FOCUS_SEARCH_NAME}) {
      background-color: oklch(var(--highlight-focus)) !important;
      color: oklch(var(--highlight-focus-foreground)) !important;
    }
    ::highlight(${MDX_TREE_HIGHLIGHT_NAME}) {
      background-color: oklch(var(--highlight)) !important;
      color: oklch(var(--highlight-foreground)) !important;
    }
  `;
  document.head.appendChild(style);
}

type ThemeColor = { key: string; value: string };

export function getThemePreviewPalette(themeName: string): {
  light: ThemeColor[];
  dark: ThemeColor[];
  lightBg: ThemeColor;
  darkBg: ThemeColor;
} | null {
  const themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    return null;
  }

  const colorKeys = ["sidebar", "primary", "foreground", "background", "muted", "accent"];

  const getColorWithHealing = (mode: "light" | "dark", key: string): string | null => {
    const oppositeMode = mode === "light" ? "dark" : "light";

    // 1. Mode specific
    let value = themeItem.cssVars[mode]?.[key];

    // 2. Opposite mode (invert)
    if (!value && themeItem.cssVars[oppositeMode]?.[key]) {
      value = invertColor(themeItem.cssVars[oppositeMode][key]);
    }

    // 3. Shared
    if (!value && themeItem.cssVars.theme?.[key]) {
      value = themeItem.cssVars.theme[key];
    }

    return value || null;
  };

  // Resolve sidebar first for fallback
  const sidebarLight = getColorWithHealing("light", "sidebar") || "0 0 0";
  const sidebarDark = getColorWithHealing("dark", "sidebar") || "1 0 0";

  const light: ThemeColor[] = colorKeys.map((key) => ({
    key,
    value: getColorWithHealing("light", key) || sidebarLight,
  }));

  const dark: ThemeColor[] = colorKeys.map((key) => ({
    key,
    value: getColorWithHealing("dark", key) || sidebarDark,
  }));

  return {
    light,
    dark,
    lightBg: { key: "sidebar", value: sidebarLight },
    darkBg: { key: "sidebar", value: sidebarDark },
  };
}

export const ALL_THEMES = registry.items.map((item) => item.name);
