import { ALL_THEMES, getThemePreviewPalette } from "@/features/theme/theme-lib";
import React from "react";

const ThemePreviewCard: React.FC<{ themeName: string }> = ({ themeName }) => {
  const palette = getThemePreviewPalette(themeName);

  if (!palette) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
        <h3 className="text-lg font-semibold text-black mb-4 capitalize tracking-tight">{themeName.replace(/-/g, ' ')}</h3>
        <p className="text-gray-600">Theme data not available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 hover:scale-105">
      <h3 className="text-lg font-semibold text-black mb-6 capitalize tracking-tight">
        {themeName.replace(/-/g, ' ')}
      </h3>

      <div className="space-y-4">
        {/* Light mode preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black">Light Mode</span>
          </div>
          <div className="flex gap-1 p-3 rounded-lg border border-gray-200 bg-gray-50">
            {palette.light.slice(0, 6).map((color, index) => (
              <div
                key={`light-${index}`}
                className="w-6 h-6 rounded-full flex-shrink-0 border border-white shadow-sm"
                style={{ backgroundColor: `oklch(${color.value})` }}
                title={`${color.key}: ${color.value}`}
              />
            ))}
          </div>
        </div>

        {/* Dark mode preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black">Dark Mode</span>
          </div>
          <div className="flex gap-1 p-3 rounded-lg border border-gray-700 bg-gray-900">
            {palette.dark.slice(0, 6).map((color, index) => (
              <div
                key={`dark-${index}`}
                className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-600 shadow-sm"
                style={{ backgroundColor: `oklch(${color.value})` }}
                title={`${color.key}: ${color.value}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ThemePreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Spotlight-style header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-black mb-4 tracking-tight">
              Theme Gallery
            </h1>
            <p className="text-xl text-gray-700 mb-2">
              All available themes with neutral preview
            </p>
            <p className="text-sm text-gray-500">
              {ALL_THEMES.length} themes available
            </p>
          </div>
        </div>
      </div>

      {/* Grid layout inspired by Spotlight */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {ALL_THEMES.map((themeName) => (
            <ThemePreviewCard key={themeName} themeName={themeName} />
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
            <h3 className="text-xl font-semibold text-black mb-4 text-center">Color System</h3>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-2xl mx-auto">
              Each theme displays up to 6 key colors: sidebar, primary, foreground, background, muted, and accent.
              Colors are shown in OKLCH format for both light and dark modes.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {['sidebar', 'primary', 'foreground', 'background', 'muted', 'accent'].map((colorName, index) => (
                <div key={colorName} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-gray-300 bg-gray-200"></div>
                  <span className="text-black capitalize">{colorName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;