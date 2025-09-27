export const DEFAULT_THEME_STATE: ThemeState = {
  themeName: "cosmic-night",
  mode: "light",
};

export interface ThemeState {
  themeName: string;
  mode: ResolvedTheme;
}

export type ResolvedTheme = "light" | "dark";
export type ThemePreference = ResolvedTheme | "system";
