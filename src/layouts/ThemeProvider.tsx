import useLocalStorage2 from "@/hooks/useLocalStorage2";
import React, { createContext, ReactNode, useCallback, useContext, useLayoutEffect, useState } from "react";

type ResolvedTheme = "light" | "dark";
type ThemePreference = ResolvedTheme | "system";

interface ThemeContextValue {
  value: ThemePreference;
  // Resolved concrete theme applied to the document (never "system")
  theme: ResolvedTheme;
  // User preference (may be "system")
  preference: ThemePreference;
  // Set preference (light | dark | system)
  setPreference: (pref: ThemePreference) => void;
  // Toggle only between light/dark (keeps you out of system mode)
  toggleTheme: () => void;
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
  // 1. Simplified state: Persisted preference is the primary state.
  const { storedValue, setStoredValue } = useLocalStorage2<ThemePreference>("theme/lightdark", "system");

  // 2. State for the system's theme, which we subscribe to.
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Effect for subscribing to system theme changes.
  useLayoutEffect(() => {
    // This effect only runs when the component mounts.
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    // Use the modern, recommended API.
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup listener on unmount.
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // 3. The actual theme to apply is derived from preference and systemTheme.
  const theme: ResolvedTheme = storedValue === "system" ? systemTheme : storedValue;

  // Effect for applying the theme class to the <html> element.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    // Toggle is simpler: it just flips the current *resolved* theme.
    setStoredValue(theme === "light" ? "dark" : "light");
  }, [theme, setStoredValue]);

  const value: ThemeContextValue = {
    value: storedValue,
    theme,
    preference: storedValue,
    setPreference: setStoredValue, // Renamed from setTheme for clarity
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeSettings = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeSettings must be used within a ThemeProvider");
  }
  return ctx;
};
