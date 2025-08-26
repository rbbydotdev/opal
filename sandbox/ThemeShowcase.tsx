import React from "react";
import { type ThemeRegistry, getThemeNames, getThemePreviewPalette } from "../src/theme/theme-lib";
import themeRegistry from "../src/theme/themes.json";

const ThemePreviewCard: React.FC<{ themeName: string }> = ({ themeName }) => {
  const palette = getThemePreviewPalette(themeName);

  if (!palette) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{themeName}</h3>
        <p className="text-gray-500">Theme data not available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{themeName}</h3>

      <div className="flex items-center gap-4">
        {/* Light mode preview */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-2 rounded border" style={{ backgroundColor: "white" }}>
            {palette.light.map((color, index) => (
              <div
                key={`light-${index}`}
                className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200"
                style={{ backgroundColor: color.value }}
                title={`Light mode color ${index + 1}`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 font-medium">Light</span>
        </div>

        {/* Dark mode preview */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-2 rounded border border-gray-700" style={{ backgroundColor: "black" }}>
            {palette.dark.map((color, index) => (
              <div
                key={`dark-${index}`}
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: color.value }}
                title={`Dark mode color ${index + 1}`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 font-medium">Dark</span>
        </div>
      </div>
    </div>
  );
};

const ThemeShowcase: React.FC = () => {
  const themeNames = getThemeNames(themeRegistry as unknown as ThemeRegistry);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Theme Showcase</h1>
          <p className="text-xl text-gray-600">
            Explore all available themes with their light and dark mode color palettes
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Showing {themeNames.length} themes with 4 colors each for light and dark modes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themeNames.map((themeName) => (
            <ThemePreviewCard key={themeName} themeName={themeName} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 inline-block">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Color Key</h3>
            <p className="text-sm text-gray-600 mb-3">Each theme shows 4 colors in this order:</p>
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Primary
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-900"></div>
                Foreground
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-white border border-gray-300"></div>
                Background
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-100"></div>
                Secondary
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">* Missing colors are automatically healed using mode inversion</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcase;
