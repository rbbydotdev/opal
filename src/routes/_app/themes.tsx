import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { CodeMirrorEditor } from "@/app/editor/CodeMirror";
import { useTheme } from "@/hooks/useTheme";
import { getContrastRatio } from "@/lib/colorUtils";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle, FileText, Home, Search, Settings, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/themes")({
  component: ThemesPage,
});

interface ContrastBadgeProps {
  ratio: number;
  className?: string;
}

function ContrastBadge({ ratio, className }: ContrastBadgeProps) {
  const getContrastLevel = (ratio: number) => {
    if (ratio >= 7) return { level: "AAA", icon: CheckCircle, color: "text-green-600" };
    if (ratio >= 4.5) return { level: "AA", icon: CheckCircle, color: "text-yellow-600" };
    if (ratio >= 3) return { level: "AA Large", icon: AlertCircle, color: "text-orange-600" };
    return { level: "FAIL", icon: XCircle, color: "text-red-600" };
  };

  const { level, icon: Icon, color } = getContrastLevel(ratio);

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <Icon className={`w-3 h-3 ${color}`} />
      <span className={color}>
        {ratio.toFixed(1)} ({level})
      </span>
    </div>
  );
}

function ColorSwatch({
  colorVar,
  bgVar,
  label,
  textColor = "white",
}: {
  colorVar: string;
  bgVar?: string;
  label: string;
  textColor?: string;
}) {
  const [ratio, setRatio] = useState<number>(1);

  useEffect(() => {
    // Get computed styles to calculate contrast
    const computedColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar);
    const computedBg = bgVar
      ? getComputedStyle(document.documentElement).getPropertyValue(bgVar)
      : getComputedStyle(document.documentElement).getPropertyValue("--background");

    if (computedColor && computedBg) {
      setRatio(getContrastRatio(computedColor.trim(), computedBg.trim()));
    }
  }, [colorVar, bgVar]);

  return (
    <div className="space-y-2">
      <div
        className="p-4 rounded-lg relative"
        style={{
          backgroundColor: `var(${colorVar})`,
          color: textColor,
        }}
      >
        <div className="font-semibold">{label}</div>
        <div className="text-sm opacity-75">{colorVar}</div>
        {bgVar && <div className="text-xs opacity-60">on {bgVar}</div>}
        <div className="absolute top-2 right-2">
          <ContrastBadge ratio={ratio} />
        </div>
      </div>
    </div>
  );
}

function WorkspaceButtonBarPreview() {
  return (
    <div className="w-16 h-64 bg-background border-r border-border flex flex-col items-center py-4 space-y-4">
      <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
        <Home className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center hover:bg-accent transition-colors">
        <Search className="w-4 h-4 text-muted-foreground hover:text-accent-foreground" />
      </div>
      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center hover:bg-accent transition-colors">
        <Settings className="w-4 h-4 text-muted-foreground hover:text-accent-foreground" />
      </div>
    </div>
  );
}

function SidebarPreview() {
  return (
    <div className="w-64 h-64 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-sidebar-border bg-sidebar">
        <h3 className="font-semibold text-sidebar-foreground">Files</h3>
      </div>
      <div className="p-2 space-y-1">
        <div className="p-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
          <FileText className="w-4 h-4 inline mr-2" />
          index.tsx
        </div>
        <div className="p-2 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
          <FileText className="w-4 h-4 inline mr-2" />
          styles.css
        </div>
        <div className="p-2 rounded bg-sidebar-primary text-sidebar-primary-foreground">
          <FileText className="w-4 h-4 inline mr-2" />
          themes.tsx
        </div>
      </div>
    </div>
  );
}

function SearchDialogPreview() {
  return (
    <div className="w-full max-w-md bg-search border-2 border-search-border rounded-lg overflow-hidden">
      <div className="p-3 bg-search-header-bg">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4" />
          <span className="font-mono text-xs">search</span>
        </div>
        <Input placeholder="search workspace..." className="bg-search-primary border-search-border text-foreground" />
      </div>
      <div className="p-2 space-y-1">
        <div className="p-2 rounded hover:bg-search-row-hover cursor-pointer">
          <div className="text-sm">Example result</div>
          <div className="text-xs opacity-75">src/components/Button.tsx</div>
        </div>
        <div className="p-2 rounded bg-search-highlight-bg text-search-highlight-fg">
          <div className="text-sm">Highlighted match</div>
          <div className="text-xs opacity-75">src/theme/theme.tsx</div>
        </div>
      </div>
    </div>
  );
}

function CodeMirrorPreview() {
  const sampleCode = `// Sample TypeScript code to test syntax highlighting
import React from 'react';

interface ThemeProps {
  primary: string;
  secondary: string;
}

export const MyComponent: React.FC<ThemeProps> = ({ primary, secondary }) => {
  const [count, setCount] = useState(0);
  
  return (
    <div className="container">
      <h1 style={{ color: primary }}>Hello World</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
};`;

  return (
    <div className="w-full h-64 border border-border rounded-lg overflow-hidden">
      <div className="bg-card border-b border-border p-2">
        <span className="text-xs text-card-foreground font-mono">ThemeTest.tsx</span>
      </div>
      <div className="bg-background p-4 h-full font-mono text-sm overflow-auto">
        <pre className="text-foreground">
          <code>{sampleCode}</code>
        </pre>
      </div>
    </div>
  );
}

function ThemeTestComponent() {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-foreground">Theme Testing Ground</h2>
        <p className="text-muted-foreground">
          Test color combinations, contrast ratios, and UI components across different themes. Contrast ratios are shown
          as badges: AAA (7+), AA (4.5+), AA Large (3+), or FAIL (&lt;3).
        </p>
      </div>

      {/* Basic Color Palette with Contrast Checking */}
      <Card>
        <CardHeader>
          <CardTitle>Base Color Palette</CardTitle>
          <CardDescription>Primary color combinations with contrast ratios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch colorVar="--background" label="Background" textColor="var(--foreground)" />
            <ColorSwatch colorVar="--card" bgVar="--background" label="Card" textColor="var(--card-foreground)" />
            <ColorSwatch colorVar="--primary" label="Primary" textColor="var(--primary-foreground)" />
            <ColorSwatch colorVar="--secondary" label="Secondary" textColor="var(--secondary-foreground)" />
            <ColorSwatch colorVar="--muted" label="Muted" textColor="var(--muted-foreground)" />
            <ColorSwatch colorVar="--accent" label="Accent" textColor="var(--accent-foreground)" />
            <ColorSwatch colorVar="--destructive" label="Destructive" textColor="var(--destructive-foreground)" />
            <ColorSwatch colorVar="--border" bgVar="--background" label="Border" textColor="var(--foreground)" />
          </div>
        </CardContent>
      </Card>

      {/* Chart Colors with Background Contrast */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Colors</CardTitle>
          <CardDescription>Chart colors tested against different backgrounds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chart colors on background */}
            <div>
              <h4 className="text-sm font-semibold mb-2">On Background</h4>
              <div className="flex gap-2 p-4 bg-background rounded border">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div
                      className="w-16 h-16 rounded flex items-end p-1"
                      style={{ backgroundColor: `oklch(var(--chart-${i}))` }}
                    >
                      <span className="text-xs text-white font-mono">#{i}</span>
                    </div>
                    <ContrastBadge ratio={getContrastRatio(`oklch(var(--chart-${i}))`, `var(--background)`)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart colors on card */}
            <div>
              <h4 className="text-sm font-semibold mb-2">On Card Background</h4>
              <div className="flex gap-2 p-4 bg-card rounded border">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div
                      className="w-16 h-16 rounded flex items-end p-1"
                      style={{ backgroundColor: `oklch(var(--chart-${i}))` }}
                    >
                      <span className="text-xs text-white font-mono">#{i}</span>
                    </div>
                    <ContrastBadge ratio={getContrastRatio(`oklch(var(--chart-${i}))`, `var(--card)`)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI Component Previews */}
      <Card>
        <CardHeader>
          <CardTitle>UI Component Previews</CardTitle>
          <CardDescription>Real UI components to test color interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WorkspaceButtonBar */}
            <div>
              <h4 className="text-sm font-semibold mb-2">WorkspaceButtonBar</h4>
              <WorkspaceButtonBarPreview />
            </div>

            {/* Sidebar */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Sidebar</h4>
              <SidebarPreview />
            </div>

            {/* Search Dialog */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Search Dialog</h4>
              <SearchDialogPreview />
            </div>

            {/* CodeMirror */}
            <div>
              <h4 className="text-sm font-semibold mb-2">CodeMirror Editor</h4>
              <CodeMirrorPreview />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive UI Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Elements</CardTitle>
          <CardDescription>Buttons, inputs, and other interactive components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Buttons */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Buttons</h4>
              <div className="flex gap-3 flex-wrap">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            {/* Form Elements */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Form Elements</h4>
              <div className="space-y-3 max-w-md">
                <Input placeholder="Text input" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Badges</h4>
              <div className="flex gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>

            {/* Dialog */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Dialog</h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Theme Test Dialog</DialogTitle>
                    <DialogDescription>This dialog tests the popover colors and contrast.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Input in dialog" />
                    <div className="flex gap-2">
                      <Button>Save</Button>
                      <Button variant="outline">Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search-specific Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Search Theme Colors</CardTitle>
          <CardDescription>Colors specific to search functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch colorVar="--search-bg" label="Search Background" />
            <ColorSwatch
              colorVar="--search-primary"
              bgVar="--search-bg"
              label="Search Primary"
              textColor="var(--foreground)"
            />
            <ColorSwatch
              colorVar="--search-border"
              bgVar="--background"
              label="Search Border"
              textColor="var(--foreground)"
            />
            <ColorSwatch colorVar="--search-row-hover" label="Row Hover" textColor="var(--foreground)" />
            <ColorSwatch colorVar="--search-highlight-bg" label="Highlight BG" textColor="var(--search-highlight-fg)" />
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Theme Colors</CardTitle>
          <CardDescription>Colors specific to sidebar components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch colorVar="--sidebar-background" label="Sidebar BG" textColor="var(--sidebar-foreground)" />
            <ColorSwatch colorVar="--sidebar-foreground" bgVar="--sidebar-background" label="Sidebar Text" />
            <ColorSwatch
              colorVar="--sidebar-primary"
              label="Sidebar Primary"
              textColor="var(--sidebar-primary-foreground)"
            />
            <ColorSwatch
              colorVar="--sidebar-accent"
              label="Sidebar Accent"
              textColor="var(--sidebar-accent-foreground)"
            />
            <ColorSwatch
              colorVar="--sidebar-border"
              bgVar="--sidebar-background"
              label="Sidebar Border"
              textColor="var(--sidebar-foreground)"
            />
            <ColorSwatch
              colorVar="--sidebar-ring"
              bgVar="--sidebar-background"
              label="Sidebar Ring"
              textColor="var(--sidebar-foreground)"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ThemesPage() {
  const { themeName, mode, setTheme, availableThemes } = useTheme();

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
