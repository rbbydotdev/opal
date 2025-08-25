/**
 * Color derivation utilities for theme integration
 * Provides functions to derive colors from base theme colors
 */

/**
 * Converts OKLCH string to usable CSS value
 * Example: "oklch(0.5 0.1 180)" -> "0.5 0.1 180"
 */
export function extractOklchValues(oklchString: string): string {
  return oklchString.replace(/oklch\((.*?)\)/, "$1");
}

/**
 * Creates a lighter variant of an OKLCH color
 */
export function lightenOklch(oklchString: string, amount = 0.1): string {
  const values = extractOklchValues(oklchString);
  const [l, c, h] = values.split(" ").map((v) => parseFloat(v));
  const newL = Math.min(1, l! + amount);
  return `oklch(${newL.toFixed(2)} ${c} ${h})`;
}

/**
 * Creates a darker variant of an OKLCH color
 */
export function darkenOklch(oklchString: string, amount = 0.1): string {
  const values = extractOklchValues(oklchString);
  const [l, c, h] = values.split(" ").map((v) => parseFloat(v));
  const newL = Math.max(0, l! - amount);
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
  const accent = computedStyle.getPropertyValue("--accent").trim();
  const border = computedStyle.getPropertyValue("--border").trim();
  const foreground = computedStyle.getPropertyValue("--foreground").trim();

  // Set derived colors
  rootElement.style.setProperty("--subtle-hover", getSubtleHover(accent));
  rootElement.style.setProperty("--active-accent", getActiveAccent(accent));
  rootElement.style.setProperty("--border-subtle", oklchWithAlpha(border, 0.3));
  rootElement.style.setProperty("--foreground-muted", oklchWithAlpha(foreground, 0.7));
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0]! + clean[0], 16);
    const g = parseInt(clean[1]! + clean[1], 16);
    const b = parseInt(clean[2]! + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

export function luminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}
function parseCssColor(color: string): [number, number, number] | null {
  color = color.trim().toLowerCase();

  // Hex (#fff or #ffffff)
  if (color.startsWith("#")) {
    return hexToRgb(color);
  }

  // rgb() or rgba()
  const rgbMatch = color.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgbMatch) {
    return [parseFloat(rgbMatch[1]!), parseFloat(rgbMatch[2]!), parseFloat(rgbMatch[3]!)]!;
  }

  // hsl() or hsla()
  const hslMatch = color.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]!);
    const s = parseFloat(hslMatch[2]!) / 100;
    const l = parseFloat(hslMatch[3]!) / 100;
    return hslToRgb(h, s, l);
  }

  // oklch() — simplified parser
  const oklchMatch = color.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\)$/);
  if (oklchMatch) {
    const l = parseFloat(oklchMatch[1]!);
    const c = parseFloat(oklchMatch[2]!);
    const h = parseFloat(oklchMatch[3]!);
    return oklchToRgb(l, c, h);
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ⚠️ Simplified OKLCH → sRGB conversion (approximate)
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  // For simplicity, treat OKLCH like LCH in Lab space
  const hr = (h * Math.PI) / 180;
  const a = Math.cos(hr) * c;
  const bComp = Math.sin(hr) * c;

  // Convert to Lab-like
  const L = l * 100;
  const A = a * 100;
  const B = bComp * 100;

  // Convert Lab → XYZ → sRGB (very simplified)
  const y = (L + 16) / 116;
  const x = A / 500 + y;
  const z = y - B / 200;

  const X = 95.047 * (x ** 3 > 0.008856 ? x ** 3 : (x - 16 / 116) / 7.787);
  const Y = 100.0 * (y ** 3 > 0.008856 ? y ** 3 : (y - 16 / 116) / 7.787);
  const Z = 108.883 * (z ** 3 > 0.008856 ? z ** 3 : (z - 16 / 116) / 7.787);

  let r = X * 0.032406 + Y * -0.015372 + Z * -0.004986;
  let g = X * -0.009689 + Y * 0.018758 + Z * 0.000415;
  let b = X * 0.000557 + Y * -0.00204 + Z * 0.01057;

  r = Math.max(0, Math.min(1, r)) * 255;
  g = Math.max(0, Math.min(1, g)) * 255;
  b = Math.max(0, Math.min(1, b)) * 255;

  return [Math.round(r), Math.round(g), Math.round(b)];
}

export function invertColor(color: string): string {
  if (!color) return color;
  const rgb = parseCssColor(color);
  if (!rgb) return color;
  const [r, g, b] = rgb;
  const inverted = [255 - r, 255 - g, 255 - b];
  return (
    "#" +
    inverted
      .map((v) => {
        const h = v.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}
