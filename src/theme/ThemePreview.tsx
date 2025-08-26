import { getThemePreviewPalette } from "@/theme/theme-lib";

export const ThemePreview = ({ themeName, currentTheme }: { themeName: string; currentTheme?: string }) => {
  const palette = getThemePreviewPalette(themeName);

  if (!palette) {
    return <span>{themeName}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {currentTheme === themeName && (
        <span className="text-2xs px-1 py-0.5 font-mono bg-success text-success-foreground rounded">Current</span>
      )}
      {/* Light mode preview */}
      <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: palette.lightBg.value }}>
        {palette.light.map((color, index) => (
          <div
            key={`light-${index}`}
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color.value }}
            title={`Light mode color ${color.key}`}
          />
        ))}
      </div>

      {/* Dark mode preview */}
      <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: palette.darkBg.value }}>
        {palette.dark.map((color, index) => (
          <div
            key={`dark-${index}`}
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color.value }}
            title={`Dark mode color ${color.key}`}
          />
        ))}
      </div>

      <span>{themeName}</span>
    </div>
  );
};
