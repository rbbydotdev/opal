import { DEFAULT_THEME_STATE, ResolvedTheme, ThemePreference, ThemeState } from "@/features/theme/theme-constants";
import { ALL_THEMES, applyTheme, getThemeModePrefers } from "@/features/theme/theme-lib";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ThemeContext, ThemeContextValue } from "@/layouts/ThemeContext";
import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useState } from "react";

// Helper to get the system theme
const getSystemTheme = (): ResolvedTheme => {
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

export const ThemeProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  // Light/dark mode preference
  const { storedValue: modePreference, setStoredValue: setModePreference } = useLocalStorage<ThemePreference>(
    "theme/lightdark",
    "system"
  );

  // Theme selection state
  const { storedValue: themeState, setStoredValue: setThemeState } = useLocalStorage<ThemeState>(
    "app-theme",
    DEFAULT_THEME_STATE,
    { initializeWithValue: true }
  );

  // System theme detection
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Subscribe to system theme changes
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Resolve the actual theme mode to apply
  const resolvedMode: ResolvedTheme = modePreference === "system" ? systemTheme : modePreference;

  // Apply theme class to HTML element
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
  }, [resolvedMode]);

  // Apply theme styles when theme name or mode changes
  useEffect(() => {
    applyTheme({
      theme: themeState.themeName,
      mode: resolvedMode,
    });
  }, [themeState.themeName, resolvedMode]);

  const setTheme = useCallback(
    (themeName: string) => {
      const preferMode = getThemeModePrefers(themeName);
      const newState = { ...themeState, themeName, mode: preferMode || resolvedMode };
      setThemeState(newState);
      applyTheme({
        theme: themeName,
        mode: newState.mode,
      });
    },
    [themeState, resolvedMode, setThemeState]
  );

  const toggleTheme = useCallback(() => {
    setModePreference(resolvedMode === "light" ? "dark" : "light");
  }, [resolvedMode, setModePreference]);

  const availableThemes = ALL_THEMES.sort((a, b) => {
    if (a === themeState.themeName) return -1;
    if (b === themeState.themeName) return 1;
    return a.localeCompare(b);
  });

  const value: ThemeContextValue = {
    // Theme mode (light/dark) settings
    value: modePreference,
    theme: resolvedMode,
    preference: modePreference,
    setPreference: setModePreference,
    toggleTheme,

    // Theme selection
    themeName: themeState.themeName,
    mode: resolvedMode,
    setMode: setModePreference,
    setTheme,
    availableThemes,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
