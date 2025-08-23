/**
 * Standalone Shadcn Theme Library
 * Apply themes from registry.json to any root element
 * No dependencies - just import your registry.json
 */

import { invertColor } from "@/lib/colorUtils";

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
const ALL_VARS = new Set([
  "accent",
  "accent-foreground",
  "background",
  "border",
  "card",
  "card-foreground",
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
  "shadow-color",
  "shadow-opacity",
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
export function getThemeModePrefers(themeName: string, registry: ThemeRegistry): "light" | "dark" | null {
  const themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    console.warn(`Theme "${themeName}" not found in registry`);
    return null;
  }
  return themePrefersMode(themeItem);
}

export function applyTheme(registry: ThemeRegistry, options: ApplyThemeOptions): void {
  const { theme: themeName, mode, rootElement = document.documentElement } = options;

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

  // Apply dark/light class
  if (mode === "dark") {
    rootElement.classList.add("dark");
    rootElement.classList.remove("light");
  } else {
    rootElement.classList.remove("dark");
    rootElement.classList.add("light");
  }

  const oppositeMode = mode === "light" ? "dark" : "light";

  // Build variables with healing
  const variables: Record<string, string> = {};

  ALL_VARS.forEach((key) => {
    let value: string | undefined;

    // 1. Current mode
    value = themeItem!.cssVars[mode]?.[key];

    // 2. Opposite mode (inverted)
    if (!value && themeItem!.cssVars[oppositeMode]?.[key]) {
      value = invertColor(themeItem!.cssVars[oppositeMode]![key]!);
    }

    // 3. Shared theme vars
    if (!value && themeItem!.cssVars.theme?.[key]) {
      value = themeItem!.cssVars.theme[key];
    }

    if (value) {
      variables[key] = value;
    }
  });

  // Clear previous theme variables
  ALL_VARS.forEach((key) => {
    rootElement.style.removeProperty(`--${key}`);
  });

  // Set CSS custom properties
  Object.entries(variables).forEach(([key, value]) => {
    rootElement.style.setProperty(`--${key}`, value);
  });
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
