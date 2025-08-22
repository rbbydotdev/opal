import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/sandbox")({
  component: SandboxPage,
});

function ThemeTestComponent() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Theme Test Component</h2>

      {/* Basic colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-background border border-border rounded">
          <h3 className="font-semibold text-foreground">Background</h3>
          <p className="text-muted-foreground">bg-background</p>
        </div>
        <div className="p-4 bg-card border border-border rounded">
          <h3 className="font-semibold text-card-foreground">Card</h3>
          <p className="text-muted-foreground">bg-card</p>
        </div>
        <div className="p-4 bg-primary text-primary-foreground rounded">
          <h3 className="font-semibold">Primary</h3>
          <p className="opacity-80">bg-primary</p>
        </div>
        <div className="p-4 bg-secondary text-secondary-foreground rounded">
          <h3 className="font-semibold">Secondary</h3>
          <p className="opacity-80">bg-secondary</p>
        </div>
      </div>

      {/* Accent colors */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted text-muted-foreground rounded">
          <h3 className="font-semibold">Muted</h3>
          <p>bg-muted</p>
        </div>
        <div className="p-4 bg-accent text-accent-foreground rounded">
          <h3 className="font-semibold">Accent</h3>
          <p>bg-accent</p>
        </div>
        <div className="p-4 bg-destructive text-destructive-foreground rounded">
          <h3 className="font-semibold">Destructive</h3>
          <p>bg-destructive</p>
        </div>
      </div>

      {/* UI Elements */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button variant="default">Default Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="destructive">Destructive Button</Button>
        </div>

        <div className="p-4 border border-border rounded-lg">
          <p className="text-foreground">Border color test</p>
          <input
            className="mt-2 px-3 py-2 border border-input rounded bg-background text-foreground"
            placeholder="Input with border-input"
          />
        </div>

        <div className="p-4 ring-2 ring-ring rounded-lg">
          <p className="text-foreground">Ring color test (ring-ring)</p>
        </div>
      </div>

      {/* Search colors */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Search Theme Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 bg-search text-white rounded text-sm">
            <div>Search BG</div>
            <div className="opacity-75">bg-search</div>
          </div>
          <div className="p-3 border-2 border-search-border rounded text-sm text-foreground">
            <div>Search Border</div>
            <div className="opacity-75">border-search-border</div>
          </div>
          <div className="p-3 bg-search-row-hover text-foreground rounded text-sm">
            <div>Row Hover</div>
            <div className="opacity-75">bg-search-row-hover</div>
          </div>
          <div className="p-3 bg-search-highlight-bg text-search-highlight-fg rounded text-sm">
            <div>Highlight</div>
            <div className="opacity-75">highlight colors</div>
          </div>
        </div>
      </div>

      {/* Chart colors */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Chart Colors</h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`w-16 h-16 rounded`} style={{ backgroundColor: `oklch(var(--chart-${i}))` }}>
              <div className="text-xs text-white p-1">Chart {i}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SandboxPage() {
  const { themeName, mode, setTheme, toggleMode, availableThemes } = useTheme();

  // Apply the modern-minimal theme on mount for testing
  useEffect(() => {
    setTheme("modern-minimal");
  }, []);

  return (
    <div className="w-full h-screen max-h-screen flex flex-col bg-background">
      {/* Theme controls */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex gap-4 items-center">
          <div className="text-card-foreground">
            Current: <strong>{themeName}</strong> ({mode})
          </div>
          <Button onClick={toggleMode} variant="outline">
            Toggle {mode === "light" ? "Dark" : "Light"}
          </Button>
          <select
            value={themeName}
            onChange={(e) => setTheme(e.target.value)}
            className="px-3 py-1 border border-input rounded bg-background text-foreground"
          >
            {availableThemes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Theme test component */}
      <div className="flex-1 overflow-auto">
        <ThemeTestComponent />
      </div>
    </div>
  );
}
