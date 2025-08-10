import useDarkMode from "use-dark-mode";
import * as React from "react";

const DarkModeContext = React.createContext<{
  isDark: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
} | null>(null);

export function ThemeProvider({ 
  children, 
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true 
}: { 
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
}) {
  const darkMode = useDarkMode(defaultTheme === 'dark');
  
  const contextValue = React.useMemo(() => ({
    isDark: darkMode.value,
    toggle: darkMode.toggle,
    enable: darkMode.enable,
    disable: darkMode.disable,
  }), [darkMode]);

  return (
    <DarkModeContext.Provider value={contextValue}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(DarkModeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return {
    theme: context.isDark ? 'dark' : 'light',
    setTheme: (theme: string) => {
      if (theme === 'dark') context.enable();
      else if (theme === 'light') context.disable();
      else context.toggle();
    }
  };
}
