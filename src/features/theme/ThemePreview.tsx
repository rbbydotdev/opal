import { getThemePreviewPalette } from "@/features/theme/theme-lib";

export const ThemePreview = ({
  themeName,
  currentTheme,
  mode,
}: {
  themeName: string;
  currentTheme?: string;
  mode?: "light" | "dark";
}) => {
  const palette = getThemePreviewPalette(themeName);

  if (!palette) {
    return <span>{themeName}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {currentTheme === themeName && (
        <span className="text-2xs px-1 py-0.5 font-mono bg-success text-success-foreground rounded">Current</span>
      )}
      {(!mode || mode === "light") && (
        <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: `oklch(${palette.lightBg.value})` }}>
          {palette.light.map((color, index) => (
            <div
              key={`light-${index}`}
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: `oklch(${color.value})` }}
              title={`Light mode color ${color.key}`}
            />
          ))}
        </div>
      )}

      {(!mode || mode === "dark") && (
        <div className="flex gap-1 p-1 rounded" style={{ backgroundColor: `oklch(${palette.darkBg.value})` }}>
          {palette.dark.map((color, index) => (
            <div
              key={`dark-${index}`}
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: `oklch(${color.value})` }}
              title={`Dark mode color ${color.key}`}
            />
          ))}
        </div>
      )}

      <span>{themeName}</span>
    </div>
  );
};
