import tailwindProse from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      scrollbar: {
        thin: "thin",
      },
      animationIterationCount: {
        once: "1",
        infinite: "infinite",
        "2": "2",
        "3": "3",
        "5": "5",
      },
      fontSize: {
        "2xs": ".625rem",
        "3xs": ".5rem",
        "4xs": ".375rem",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          focus: "hsl(var(--highlight-focus))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        search: {
          DEFAULT: "hsl(var(--search-bg))",
          border: "hsl(var(--search-border))",
          header: "hsl(var(--search-header-bg))",
          "row-hover": "hsl(var(--search-row-hover))",
          "match-hover": "hsl(var(--search-match-hover))",
          "highlight-bg": "hsl(var(--search-highlight-bg))",
          "highlight-fg": "hsl(var(--search-highlight-fg))",
          muted: "hsl(var(--search-muted))",
          "muted-2": "hsl(var(--search-muted-2))",
          icon: "hsl(var(--search-icon))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          background: "hsl(var(--sidebar-background))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  safelist: [{ pattern: /pl-.+/ }],
  plugins: [
    function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "animation-iteration": (value) => ({
            "animation-iteration-count": value,
          }),
        },
        { values: theme("animationIterationCount"), type: "any" }
      );
    },

    function ({ matchUtilities, theme }) {
      const durations = theme("transitionDuration"); // or define your own presets
      matchUtilities(
        {
          "animation-duration": (value) => ({
            "animation-duration": value,
          }),
        },
        { values: durations, type: "any" }
      );
    },

    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
        },
        ".no-scrollbar": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },
        ".no-scrollbar::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
    tailwindProse,
    require("tailwindcss-animate"),
  ],
} satisfies Config;
