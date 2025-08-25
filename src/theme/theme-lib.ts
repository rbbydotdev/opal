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
export function getThemeModePrefers(themeName: string, registry: ThemeRegistry): "light" | "dark" | null {
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

export function applyTheme(registry: ThemeRegistry, options: ApplyThemeOptions): void {
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
      const value = themeItem!.cssVars[mode]?.[key] ?? themeItem!.cssVars.theme?.[key] ?? "";
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

/**
 * Get 8-color palette for theme preview with mode healing
 * Returns 4 colors for light mode and 4 colors for dark mode
 * @param registry - Your imported registry.json
 * @param themeName - Name of the theme
 * @returns Object with light and dark arrays of colors, or null if theme not found
 */
export function getThemePreviewPalette(
  registry: ThemeRegistry,
  themeName: string
): {
  light: string[];
  dark: string[];
  lightBg: string;
  darkBg: string;
} | null {
  const themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    return null;
  }

  const colorKeys = ["sidebar", "primary", "foreground", "background", "muted", "accent"];

  const getColorWithHealing = (mode: "light" | "dark", key: string): string | null => {
    const oppositeMode = mode === "light" ? "dark" : "light";

    // 1. Current mode
    let value = themeItem.cssVars[mode]?.[key];

    // 2. Opposite mode (inverted)
    if (!value && themeItem.cssVars[oppositeMode]?.[key]) {
      value = invertColor(themeItem.cssVars[oppositeMode][key]);
    }

    // 3. Shared theme vars
    if (!value && themeItem.cssVars.theme?.[key]) {
      value = themeItem.cssVars.theme[key];
    }

    return value || null;
  };
  const sidebarIndex = colorKeys.indexOf("sidebar");

  const lightColors = colorKeys
    .map((key) => getColorWithHealing("light", key!))
    .map((color, _, a) => (!color ? a[sidebarIndex] : color)) as string[];
  const darkColors = colorKeys
    .map((key) => getColorWithHealing("dark", key!))
    .map((color, _, a) => (!color ? a[sidebarIndex] : color)) as string[];

  return {
    lightBg: lightColors[sidebarIndex] || "#000000",
    darkBg: darkColors[sidebarIndex] || "#ffffff",
    light: lightColors,
    dark: darkColors,
  };
}

export function previewTheme(registry: ThemeRegistry, options: ApplyThemeOptions): () => void {
  const { rootElement = document.documentElement } = options;

  // Save current state
  const prevClassList = {
    dark: rootElement.classList.contains("dark"),
    light: rootElement.classList.contains("light"),
  };

  const prevVars: Record<string, string> = {};
  ALL_VARS.forEach((key) => {
    const value = rootElement.style.getPropertyValue(`--${key}`);
    if (value) {
      prevVars[key] = value;
    }
  });

  // Apply new theme
  applyTheme(registry, options);

  // Return revert function
  return () => {
    // Restore classes
    rootElement.classList.toggle("dark", prevClassList.dark);
    rootElement.classList.toggle("light", prevClassList.light);

    // Clear all theme vars
    ALL_VARS.forEach((key) => {
      rootElement.style.removeProperty(`--${key}`);
    });

    // Restore previous vars
    Object.entries(prevVars).forEach(([key, value]) => {
      rootElement.style.setProperty(`--${key}`, value);
    });
  };
}
