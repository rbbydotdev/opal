import { ResolvedTheme, ThemePreference } from "@/features/theme/theme-constants";
import { createContext, useContext } from "react";

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
export const useThemeContext = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return ctx;
};
export interface ThemeContextValue {
  // Theme mode (light/dark) settings
  value: ThemePreference;
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;

  // Theme selection
  themeName: string;
  mode: ResolvedTheme;
  setMode: (mode: ThemePreference) => void;
  setTheme: (themeName: string) => void;
  availableThemes: string[];
}
