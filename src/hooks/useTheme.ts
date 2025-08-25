// import themeRegistry from "@/theme/registry.json";
// import themeRegistry from "@/theme/vscode-themes.json";
import themeRegistry from "@/theme/themes.json";

import { useThemeSettings } from "@/layouts/ThemeProvider";
import { applyTheme, getThemeModePrefers, type ThemeRegistry } from "@/theme/theme-lib";
import { useCallback, useEffect } from "react";
import useLocalStorage2 from "./useLocalStorage2";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  themeName: string;
  mode: ThemeMode;
}

const DEFAULT_THEME_STATE: ThemeState = {
  themeName: "default",
  mode: "light",
};

export function useTheme() {
  const { value, setPreference } = useThemeSettings();
  const { storedValue: themeState, setStoredValue: setThemeState } = useLocalStorage2<ThemeState>(
    "app-theme",
    DEFAULT_THEME_STATE,
    { initializeWithValue: true }
  );

  const setTheme = useCallback(
    (themeName: string) => {
      const preferMode = getThemeModePrefers(themeName, themeRegistry as unknown as ThemeRegistry);
      console.debug("theme prefers mode:", preferMode);
      const newState = { ...themeState, themeName, mode: preferMode || themeState.mode };
      setThemeState(newState);
      applyTheme(themeRegistry as unknown as ThemeRegistry, {
        theme: themeName,
        mode: newState.mode,
      });
    },
    [themeState, setThemeState]
  );

  // Apply theme on mount and when theme state changes
  useEffect(() => {
    applyTheme(themeRegistry as unknown as ThemeRegistry, {
      theme: themeState.themeName,
      mode: themeState.mode,
    });
  }, [themeState.themeName, themeState.mode]);

  return {
    themeName: themeState.themeName,
    mode: value,
    setMode: setPreference,
    setTheme,
    availableThemes: themeRegistry.items
      .map((item) => item.name)
      .sort((a, b) => {
        if (a === themeState.themeName) return -1;
        if (b === themeState.themeName) return 1;
        return a.localeCompare(b);
      }),
  };
}
