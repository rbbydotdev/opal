// import themeRegistry from "@/theme/registry.json";
// import themeRegistry from "@/theme/vscode-themes.json";
import themeRegistry from "@/theme/themes.json";

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
  const { storedValue: themeState, setStoredValue: setThemeState } = useLocalStorage2<ThemeState>(
    "app-theme",
    DEFAULT_THEME_STATE,
    { initializeWithValue: true }
  );
  // console.log(themeState, "useTheme state");

  const setMode = useCallback(
    (mode: ThemeMode) => {
      const newState = { ...themeState, mode };
      setThemeState(newState);
      applyTheme(themeRegistry as unknown as ThemeRegistry, {
        theme: newState.themeName,
        mode,
      });
    },
    [themeState, setThemeState]
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

  const toggleMode = useCallback(() => {
    const newMode = themeState.mode === "light" ? "dark" : "light";
    setMode(newMode);
  }, [themeState.mode, setMode]);

  // Apply theme on mount and when theme state changes
  useEffect(() => {
    applyTheme(themeRegistry as unknown as ThemeRegistry, {
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
    availableThemes: themeRegistry.items
      .map((item) => item.name)
      .sort((a, b) => {
        if (a === themeState.themeName) return -1;
        if (b === themeState.themeName) return 1;
        return a.localeCompare(b);
      }),
  };
}
