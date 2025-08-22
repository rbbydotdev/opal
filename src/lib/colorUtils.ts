/**
 * Color derivation utilities for theme integration
 * Provides functions to derive colors from base theme colors
 */

/**
 * Converts OKLCH string to usable CSS value
 * Example: "oklch(0.5 0.1 180)" -> "0.5 0.1 180"
 */
export function extractOklchValues(oklchString: string): string {
  return oklchString.replace(/oklch\((.*?)\)/, '$1');
}

/**
 * Creates a lighter variant of an OKLCH color
 */
export function lightenOklch(oklchString: string, amount = 0.1): string {
  const values = extractOklchValues(oklchString);
  const [l, c, h] = values.split(' ').map(v => parseFloat(v));
  const newL = Math.min(1, l + amount);
  return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

/**
 * Creates a darker variant of an OKLCH color
 */
export function darkenOklch(oklchString: string, amount = 0.1): string {
  const values = extractOklchValues(oklchString);
  const [l, c, h] = values.split(' ').map(v => parseFloat(v));
  const newL = Math.max(0, l - amount);
  return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

/**
 * Creates an alpha variant of an OKLCH color
 */
export function oklchWithAlpha(oklchString: string, alpha: number): string {
  const values = extractOklchValues(oklchString);
  return `oklch(${values} / ${alpha})`;
}

/**
 * Gets a subtle accent color for hover states
 */
export function getSubtleHover(baseColor: string): string {
  return oklchWithAlpha(baseColor, 0.5);
}

/**
 * Gets a more pronounced accent color for active states  
 */
export function getActiveAccent(baseColor: string): string {
  return oklchWithAlpha(baseColor, 0.7);
}

/**
 * Creates CSS custom properties for derived colors
 */
export function createDerivedColorVars(rootElement: HTMLElement) {
  const computedStyle = getComputedStyle(rootElement);
  
  // Get base colors
  const accent = computedStyle.getPropertyValue('--accent').trim();
  const border = computedStyle.getPropertyValue('--border').trim();
  const foreground = computedStyle.getPropertyValue('--foreground').trim();
  
  // Set derived colors
  rootElement.style.setProperty('--subtle-hover', getSubtleHover(accent));
  rootElement.style.setProperty('--active-accent', getActiveAccent(accent));
  rootElement.style.setProperty('--border-subtle', oklchWithAlpha(border, 0.3));
  rootElement.style.setProperty('--foreground-muted', oklchWithAlpha(foreground, 0.7));
}