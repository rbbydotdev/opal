/**
 * Standalone Shadcn Theme Library
 * Apply themes from registry.json to any root element
 * No dependencies - just import your registry.json
 */

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

export interface ApplyThemeOptions {
  theme: string;
  mode: "light" | "dark";
  rootElement?: HTMLElement;
}

/**
 * Apply a theme to the root element
 * @param registry - Your imported registry.json (annotated with ThemeRegistry type)
 * @param options - Theme name, mode, and optional root element
 */
export function applyTheme(registry: ThemeRegistry, options: ApplyThemeOptions): void {
  const { theme: themeName, mode, rootElement = document.documentElement } = options;

  // Find the theme in registry
  let themeItem = registry.items.find((item) => item.name === themeName);
  if (!themeItem) {
    console.warn(`Theme "${themeName}" not found in registry`);
  }
  if (!themeItem) {
    themeItem = registry.items.find((item) => item.name === "default");
    console.warn(`Theme default not found in registry`);
    return;
  }

  // Apply dark/light class
  if (mode === "dark") {
    rootElement.classList.add("dark");
    rootElement.classList.remove("light");
  } else {
    rootElement.classList.remove("dark");
    rootElement.classList.add("light");
  }

  // Apply theme CSS variables
  const variables = {
    ...themeItem.cssVars.theme, // Common variables

    ...(themeItem.cssVars["light"] ?? themeItem.cssVars["dark"]),

    ...(themeItem.cssVars[mode] ?? themeItem.cssVars["light"] ?? themeItem.cssVars["dark"]),
  };
  // console.log(mode, JSON.stringify(variables, null, 4));

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
