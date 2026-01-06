import { ALL_THEMES, getThemePreviewPalette } from "@/features/theme/theme-lib";
import React from "react";

const ThemeListItem: React.FC<{ themeName: string }> = ({ themeName }) => {
  const palette = getThemePreviewPalette(themeName);

  return (
    <div className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2">
      {/* Theme colors preview - exactly like Spotlight */}
      <div className="flex gap-1">
        {palette ? (
          <>
            <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: `oklch(${palette.lightBg.value})` }}>
              {palette.light.map((color, index) => (
                <div
                  key={`light-${index}`}
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `oklch(${color.value})` }}
                />
              ))}
            </div>
            <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: `oklch(${palette.darkBg.value})` }}>
              {palette.dark.map((color, index) => (
                <div
                  key={`dark-${index}`}
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `oklch(${color.value})` }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        )}
      </div>

      {/* Theme name */}
      <div className="flex-1">
        <span className="text-black font-medium">
          {themeName.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
      </div>
    </div>
  );
};

const ThemeList: React.FC = () => {
  return (
    <div className="min-h-screen bg-white pl-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-black">All Themes</h1>
        <p className="text-gray-600 text-sm mt-1">{ALL_THEMES.length} themes available</p>
      </div>

      {/* List in 3 columns */}
      <div className="bg-white p-6">
        <div className="grid grid-cols-3 gap-x-8">
          {ALL_THEMES.map((themeName) => (
            <ThemeListItem key={themeName} themeName={themeName} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeList;
