import tailwindProse from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
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
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "oklch(var(--success) / <alpha-value>)",
          foreground: "oklch(var(--success-foreground) / <alpha-value>)",
        },
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        highlight: {
          DEFAULT: "oklch(var(--highlight) / <alpha-value>)",
          foreground: "oklch(var(--highlight-foreground) / <alpha-value>)",
          focus: "oklch(var(--highlight-focus) / <alpha-value>)",
          "focus-foreground": "oklch(var(--highlight-focus-foreground) / <alpha-value>)",
        },
        chart: {
          "1": "oklch(var(--chart-1) / <alpha-value>)",
          "2": "oklch(var(--chart-2) / <alpha-value>)",
          "3": "oklch(var(--chart-3) / <alpha-value>)",
          "4": "oklch(var(--chart-4) / <alpha-value>)",
          "5": "oklch(var(--chart-5) / <alpha-value>)",
        },
        search: {
          DEFAULT: "oklch(var(--search-bg))",
          border: "oklch(var(--search-border))",
          header: "oklch(var(--search-header-bg))",
          "row-hover": "oklch(var(--search-row-hover))",
          "match-hover": "oklch(var(--search-match-hover))",
          "highlight-bg": "oklch(var(--search-highlight-bg))",
          "highlight-fg": "oklch(var(--search-highlight-fg))",
          muted: "oklch(var(--search-muted))",
          "muted-2": "oklch(var(--search-muted-2))",
          icon: "oklch(var(--search-icon))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar) / <alpha-value>)",
          foreground: "oklch(var(--sidebar-foreground) / <alpha-value>)",
          background: "oklch(var(--sidebar-background) / <alpha-value>)",
          primary: "oklch(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "oklch(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "oklch(var(--sidebar-border) / <alpha-value>)",
          ring: "oklch(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        drift: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(200px, 200px)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        drift: "drift 1s linear infinite",
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
      const durations = theme("transitionDuration");
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
    tailwindAnimate,
  ],
} satisfies Config;
