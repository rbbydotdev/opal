import crypto from "crypto";

// Helper function to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r * 255, g * 255, b * 255];
}

// Function to create a hash from a string
function hashString(input: string): Buffer {
  return crypto.createHash("md5").update(input).digest();
}

// Function to generate a color from a hash
function generateColor(hash: Buffer, index: number): { colors: { r: number; g: number; b: number } } {
  const r = hash[index] % 256;
  const g = hash[index + 1] % 256;
  const b = hash[index + 2] % 256;
  return { colors: { r, g, b } };
}

// Function to determine the shape based on the hash
function determineShape(hash: Buffer, index: number): string {
  const shapeTypes = ["rect", "circle", "triangle"];
  return shapeTypes[hash[index] % shapeTypes.length];
}

interface IdenticonProps {
  input: string;
  size?: number; // Grid size
  scale?: number; // Size of each cell in pixels
}

const Identicon = ({ input, size = 5, scale = 20 }: IdenticonProps) => {
  const hash = hashString(input);

  // Generate the background color
  const { colors } = generateColor(hash, 0);
  const [h, s] = rgbToHsl(colors.r, colors.g, colors.b);

  // Generate the identicon grid
  const generateGrid = (): {
    color: string;
    shape: string;
    opacity: number;
    rotation: number;
    sizeModifier: number;
  }[][] => {
    const grid: { color: string; shape: string; opacity: number; rotation: number; sizeModifier: number }[][] = [];

    for (let i = 0; i < size; i++) {
      const row: { color: string; shape: string; opacity: number; rotation: number; sizeModifier: number }[] = [];
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) % hash.length;
        let l = (hash[index] % 50) + 25; // Lightness between 25% and 75%
        l = Math.max(30, l); // Clamp to ensure lightness is at least 30%
        const rgb = hslToRgb(h, s, l);
        const color = `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;
        const opacity = ((hash[index] % 50) + 50) / 100; // Opacity between 0.5 and 1.0
        const rotation = hash[index] % 360; // Rotation between 0 and 359 degrees
        const sizeModifier = ((hash[index] % 20) + 80) / 100; // Size modifier between 0.8 and 1.0
        row.push({
          color,
          shape: determineShape(hash, index),
          opacity,
          rotation,
          sizeModifier,
        });
      }
      grid.push(row);
    }

    return grid;
  };

  const grid = generateGrid();

  return (
    <div className="inline-block rounded-full overflow-hidden">
      <svg
        width={size * scale}
        height={size * scale}
        viewBox={`0 0 ${size * scale} ${size * scale}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ backgroundColor: `rgb(${colors.r},${colors.g},${colors.b})` }} // Set the background color
        stroke="none"
      >
        {grid.map((row, i) =>
          row.map((cell, j) => {
            const { color, shape, opacity, rotation, sizeModifier } = cell;
            const x = j * scale;
            const y = i * scale;
            const adjustedScale = scale * sizeModifier;

            switch (shape) {
              case "circle":
                return (
                  <circle
                    key={`${i}-${j}`}
                    cx={x + scale / 2}
                    cy={y + scale / 2}
                    r={adjustedScale / 2}
                    fill={color}
                    opacity={opacity}
                  />
                );
              case "triangle":
                return (
                  <polygon
                    key={`${i}-${j}`}
                    points={`${x + (scale - adjustedScale) / 2},${y + adjustedScale} ${x + scale / 2},${
                      y + (scale - adjustedScale) / 2
                    } ${x + adjustedScale},${y + adjustedScale}`}
                    fill={color}
                    opacity={opacity}
                    transform={`rotate(${rotation}, ${x + scale / 2}, ${y + scale / 2})`}
                  />
                );
              case "rect":
              default:
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={x + (scale - adjustedScale) / 2}
                    y={y + (scale - adjustedScale) / 2}
                    width={adjustedScale}
                    height={adjustedScale}
                    fill={color}
                    opacity={opacity}
                    transform={`rotate(${rotation}, ${x + scale / 2}, ${y + scale / 2})`}
                  />
                );
            }
          })
        )}
      </svg>
    </div>
  );
};

export default Identicon;
