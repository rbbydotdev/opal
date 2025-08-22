import { useCallback, useEffect } from "react";
import useLocalStorage2 from "./useLocalStorage2";
import themeRegistry from "@/theme/registry.json";
import { applyTheme, type ThemeRegistry, type ApplyThemeOptions } from "@/theme/theme-lib";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  themeName: string;
  mode: ThemeMode;
}

const DEFAULT_THEME_STATE: ThemeState = {
  themeName: "modern-minimal",
  mode: "light",
};

export function useTheme() {
  const { storedValue: themeState, setStoredValue: setThemeState } = useLocalStorage2<ThemeState>(
    "app-theme",
    DEFAULT_THEME_STATE,
    { initializeWithValue: true }
  );

  const setTheme = useCallback((themeName: string) => {
    const newState = { ...themeState, themeName };
    setThemeState(newState);
    applyTheme(themeRegistry as ThemeRegistry, {
      theme: themeName,
      mode: newState.mode,
    });
  }, [themeState, setThemeState]);

  const setMode = useCallback((mode: ThemeMode) => {
    const newState = { ...themeState, mode };
    setThemeState(newState);
    applyTheme(themeRegistry as ThemeRegistry, {
      theme: newState.themeName,
      mode,
    });
  }, [themeState, setThemeState]);

  const toggleMode = useCallback(() => {
    const newMode = themeState.mode === "light" ? "dark" : "light";
    setMode(newMode);
  }, [themeState.mode, setMode]);

  // Apply theme on mount and when theme state changes
  useEffect(() => {
    applyTheme(themeRegistry as ThemeRegistry, {
      theme: themeState.themeName,
      mode: themeState.mode,
    });
  }, [themeState.themeName, themeState.mode]);

  return {
    themeName: themeState.themeName,
    mode: themeState.mode,
    setTheme,
    setMode,
    toggleMode,
    availableThemes: themeRegistry.items.map(item => item.name),
  };
}