import tailwindProse from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        highlight: {
          DEFAULT: "var(--highlight)",
          focus: "var(--highlight-focus)",
        },
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        search: {
          DEFAULT: "var(--search-bg)",
          border: "var(--search-border)",
          header: "var(--search-header-bg)",
          "row-hover": "var(--search-row-hover)",
          "match-hover": "var(--search-match-hover)",
          "highlight-bg": "var(--search-highlight-bg)",
          "highlight-fg": "var(--search-highlight-fg)",
          muted: "var(--search-muted)",
          "muted-2": "var(--search-muted-2)",
          icon: "var(--search-icon)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          background: "var(--sidebar-background)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
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

    // ✨ Single shimmer-text utility
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".shimmer-text": {
          background:
            "linear-gradient(90deg, var(--shimmer-from, var(--foreground)) 25%, var(--shimmer-via, var(--muted-foreground)) 50%, var(--shimmer-to, var(--muted-foreground)) 75%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: "shimmer 4s linear infinite",
        },
      });
    }),

    tailwindProse,
    require("tailwindcss-animate"),
  ],
} satisfies Config;
