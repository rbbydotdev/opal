import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { applyTheme, getThemeModePrefers, type ThemeRegistry } from "@/theme/theme-lib";
import themeRegistry from "@/theme/themes.json";
import React, { createContext, ReactNode, useCallback, useContext, useLayoutEffect, useState, useEffect } from "react";

type ResolvedTheme = "light" | "dark";
type ThemePreference = ResolvedTheme | "system";

interface ThemeState {
  themeName: string;
  mode: ResolvedTheme;
}

const DEFAULT_THEME_STATE: ThemeState = {
  themeName: "default",
  mode: "light",
};

interface ThemeContextValue {
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

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Helper to get the system theme
const getSystemTheme = (): ResolvedTheme => {
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Light/dark mode preference
  const { storedValue: modePreference, setStoredValue: setModePreference } = useLocalStorage2<ThemePreference>("theme/lightdark", "system");
  
  // Theme selection state
  const { storedValue: themeState, setStoredValue: setThemeState } = useLocalStorage2<ThemeState>(
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
    applyTheme(themeRegistry as unknown as ThemeRegistry, {
      theme: themeState.themeName,
      mode: resolvedMode,
    });
  }, [themeState.themeName, resolvedMode]);

  const setTheme = useCallback(
    (themeName: string) => {
      const preferMode = getThemeModePrefers(themeName, themeRegistry as unknown as ThemeRegistry);
      const newState = { ...themeState, themeName, mode: preferMode || resolvedMode };
      setThemeState(newState);
      applyTheme(themeRegistry as unknown as ThemeRegistry, {
        theme: themeName,
        mode: newState.mode,
      });
    },
    [themeState, resolvedMode, setThemeState]
  );

  const toggleTheme = useCallback(() => {
    setModePreference(resolvedMode === "light" ? "dark" : "light");
  }, [resolvedMode, setModePreference]);

  const availableThemes = themeRegistry.items
    .map((item) => item.name)
    .sort((a, b) => {
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

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};

// Backward compatibility alias
export const useThemeSettings = useTheme;
