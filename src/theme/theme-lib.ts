/**
 * Standalone Shadcn Theme Library
 * Apply themes from registry.json to any root element
 * No dependencies - just import your registry.json
 */

import { invertColor } from "@/lib/colorUtils";

// Import registry.json and type it as ThemeRegistry
import registryJson from "./themes.json";

export const ALL_THEMES = registryJson.items.map((item) => item.name);

export const registry: ThemeRegistry = registryJson as unknown as ThemeRegistry;
// Types - annotate your registry.json import with these
export interface ThemeRegistry {
  items: ThemeRegistryItem[];
}

export interface ThemeRegistryItem {
  name: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
    theme?: Record<string, string>;
  };
}

export const FAVORITE_THEMES = [
  "default",
  "modern-minimal",
  "t3-chat",
  "twitter",
  "mocha-mousse",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama-grove",
  "claude",
  "mono",
  "vercel",
];

export const MAJOR_THEMES = [
  "default",
  "modern-minimal",
  "t3-chat",
  "twitter",
  "mocha-mousse",
  "bubblegum",
  "doom-64",
  "catppuccin",
  "graphite",
  "perpetuity",
  "kodama-grove",
  "cosmic-night",
  "tangerine",
  "quantum-rose",
  "nature",
  "bold-tech",
  "elegant-luxury",
  "amber-minimal",
  "supabase",
  "neo-brutalism",
  "solar-dusk",
  "claymorphism",
  "cyberpunk",
  "pastel-dreams",
  "clean-slate",
  "caffeine",
  "ocean-breeze",
  "retro-arcade",
  "midnight-bloom",
  "candyland",
  "northern-lights",
  "vintage-paper",
  "sunset-horizon",
  "starry-night",
  "claude",
  "vercel",
  "mono",
  "default-classic",
];
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
  "sidebar-border",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-ring",
  "spacing",
  "tracking-normal",
]);

export interface ApplyThemeOptions {
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
    console.warn(`Theme "${themeName}" not found in registry`);
    return null;
  }
  return themePrefersMode(themeItem);
}

export function toggleLightOrDarkClass(root: HTMLElement = document.documentElement): void {
  if (root.classList.contains("dark")) {
    root.classList.remove("dark");
    root.classList.add("light");
  } else if (root.classList.contains("light")) {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    // Default to dark if no class is set
    root.classList.add("dark");
  }
}
export function setLightOrDarkClass(mode: "light" | "dark", root: HTMLElement = document.documentElement) {
  if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

// export function getMainThemes(): ThemeRegistryItem[] {
//   const mainThemes = new Set("default");
//   // return registry.items.filter((item) => mainThemes.has(item.name)).map
// }

export function applyTheme(options: ApplyThemeOptions): void {
  const { theme: themeName } = options;

  const defaultTheme = registry.items.find((item) => item.name === "default");
  let themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    console.warn(`Theme "${themeName}" not found in registry`);
    themeItem = defaultTheme;
    if (!themeItem) {
      console.warn(`Theme default not found in registry`);
      return;
    }
  }

  // Remove any old theme style tag
  const oldStyle = document.getElementById("theme-style");
  if (oldStyle) oldStyle.remove();

  // Build CSS for light and dark
  const buildVars = (mode: "light" | "dark") => {
    const vars: string[] = [];
    ALL_VARS.forEach((key) => {
      const value =
        themeItem!.cssVars[mode]?.[key] ??
        themeItem!.cssVars.theme?.[key] ??
        invertColor(themeItem!.cssVars[mode === "light" ? "dark" : "light"]?.[key] ?? "") ??
        invertColor(themeItem!.cssVars[mode]?.[key]!) ??
        "";
      if (value) {
        vars.push(`--${key}: ${value};`);
      }
    });
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
  `;
  document.head.appendChild(style);
}

/**
 * Get all available theme names from registry
 * @param registry - Your imported registry.json
 * @returns Array of theme names
 */
export function getThemeNames(registry: ThemeRegistry): string[] {
  return registry.items.map((item) => item.name);
}

/**
 * Remove all theme styles from root element
 * @param registry - Your imported registry.json
 * @param rootElement - Optional root element (defaults to document.documentElement)
 */
export function removeTheme(registry: ThemeRegistry, rootElement: HTMLElement = document.documentElement): void {
  rootElement.classList.remove("dark", "light");

  // Get all possible CSS variable names from registry
  const allVariables = new Set<string>();
  registry.items.forEach((item) => {
    Object.keys(item.cssVars.light || {}).forEach((key) => allVariables.add(key));
    Object.keys(item.cssVars.dark || {}).forEach((key) => allVariables.add(key));
    Object.keys(item.cssVars.theme || {}).forEach((key) => allVariables.add(key));
  });

  // Remove all CSS variables
  allVariables.forEach((key) => {
    rootElement.style.removeProperty(`--${key}`);
  });
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
  const sidebarLight = getColorWithHealing("light", "sidebar") || "#000000";
  const sidebarDark = getColorWithHealing("dark", "sidebar") || "#ffffff";

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

// Generic base theme type
export interface GenericTheme<TCss = Record<string, any>> {
  name: string;
  type: string;
  title: string;
  description?: string;
  css?: TCss;
  cssVars: {
    theme?: ThemeSharedVars;
    light?: ThemeModeVars;
    dark?: ThemeModeVars;
  };
}

// Vintage Paper theme using the generic (can still narrow name if desired)
export type VintagePaperTheme<
  TCss = {
    "@layer base"?: {
      body?: {
        "letter-spacing"?: string;
      };
    };
  },
> = GenericTheme<TCss>;

// Shared vars for a single color mode (light or dark)
export type ThemeModeVars = {
  background?: string;
  foreground?: string;
  card?: string;
  "card-foreground"?: string;
  popover?: string;
  "popover-foreground"?: string;
  primary?: string;
  "primary-foreground"?: string;
  secondary?: string;
  "secondary-foreground"?: string;
  muted?: string;
  "muted-foreground"?: string;
  accent?: string;
  "accent-foreground"?: string;
  destructive?: string;
  "destructive-foreground"?: string;
  border?: string;
  input?: string;
  ring?: string;
  "chart-1"?: string;
  "chart-2"?: string;
  "chart-3"?: string;
  "chart-4"?: string;
  "chart-5"?: string;
  radius?: string;
  sidebar?: string;
  "sidebar-foreground"?: string;
  "sidebar-primary"?: string;
  "sidebar-primary-foreground"?: string;
  "sidebar-accent"?: string;
  "sidebar-accent-foreground"?: string;
  "sidebar-border"?: string;
  "sidebar-ring"?: string;
  "font-sans"?: string;
  "font-serif"?: string;
  "font-mono"?: string;
  "shadow-color"?: string;
  "shadow-opacity"?: string;
  "shadow-blur"?: string;
  "shadow-spread"?: string;
  "shadow-offset-x"?: string;
  "shadow-offset-y"?: string;
  "letter-spacing"?: string;
  spacing?: string;
  "shadow-2xs"?: string;
  "shadow-xs"?: string;
  "shadow-sm"?: string;
  shadow?: string;
  "shadow-md"?: string;
  "shadow-lg"?: string;
  "shadow-xl"?: string;
  "shadow-2xl"?: string;
  "tracking-normal"?: string;
};

// Vars that are shared across modes (theme scope)
export type ThemeSharedVars = {
  "font-sans"?: string;
  "font-mono"?: string;
  "font-serif"?: string;
  radius?: string;
  "tracking-tighter"?: string;
  "tracking-tight"?: string;
  "tracking-wide"?: string;
  "tracking-wider"?: string;
  "tracking-widest"?: string;
};
