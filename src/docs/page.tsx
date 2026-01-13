import { OpalSvg } from "@/components/OpalSvg";
import { Button } from "@/components/ui/button";
import { useBrowserCompat } from "@/features/compat-checker/CompatChecker";
import MDIcon from "@/icons/md.svg?react";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout";
import { useThemeContext } from "@/layouts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CirclePlus,
  Cloud,
  Code2,
  Command,
  Cpu,
  Database,
  Download,
  Edit,
  FileCode,
  FileCode2Icon,
  FileTextIcon,
  Filter,
  FolderTree,
  GitBranch,
  GitMerge,
  Github,
  Globe,
  Hammer,
  HardDrive,
  History,
  Image,
  KeyboardIcon,
  Link,
  ListTree,
  Lock,
  Menu,
  Monitor,
  Moon,
  Network,
  Package,
  Paintbrush,
  Palette,
  PanelRight,
  PlusCircle,
  Printer,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Server,
  Settings,
  Shield,
  Sparkle,
  SquareDashed,
  Terminal,
  Trash2Icon,
  TrendingDown,
  Upload,
  Wifi,
  Zap,
} from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { ImageWithViewer } from "./ImageWithViewer";
import { VideoPlayerFigure } from "./VideoPlayer";
// import { useTheme
export const DocImage = ({ src, className, ...props }: { src: string; className?: string }) => {
  const { mode } = useThemeContext();
  return (
    <div
      className="relative flex justify-center"
      style={{
        position: "relative",
      }}
    >
      <img
        className={cn("p-4 w-full #max-w-2xl relative rounded-lg", className, {
          invert: mode === "dark",
          "opacity-50": mode === "dark",
        })}
        src={src}
        {...props}
      />
    </div>
  );
};

export const FeatureCard = ({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) => (
  <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow">
    {Icon && (
      <div className="mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
    )}
    <h3 className="font-semibold text-lg mb-2 text-card-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

export const Section = ({
  title,
  subtitle,
  children,
  id,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  className?: string;
  id?: string;
  children: React.ReactNode;
}) => (
  <section className={cn("my-16", className)}>
    {title && (
      <div className="mb-8">
        <h2
          className="text-3xl font-bold mb-2 text-foreground border-l-4 border-l-primary p-4 bg-primary/5"
          id={id || title.toLowerCase().replace(/ /g, "-")}
        >
          {title}
        </h2>
        {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
      </div>
    )}
    {children}
  </section>
);

export const SubSection = ({
  title,
  children,
  id,
  className = "",
}: {
  title: string;
  className?: string;
  id?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("my-8", className)}>
    <h3
      className="text-2xl font-semibold mb-6 text-foreground flex items-center gap-2"
      id={id || title.toLowerCase().replace(/ /g, "-")}
    >
      {title}
    </h3>
    {children}
  </div>
);

export const DocsPageBody = () => {
  //hide left sidebar for mobile, quick hack
  const { mode } = useThemeContext();
  // const isMobile = useIsMobile();
  const {
    capabilities: { isDesktopBrowser },
  } = useBrowserCompat();
  //shrink for mobile, quick ugly hack
  const isMobile = !isDesktopBrowser; //useIsMobile();
  const { left } = useSidebarPanes();
  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (!mounted.current) {
      if (isMobile && !left.isCollapsed) left.setIsCollapsed(true);

      mounted.current = true;
    }
  }, [isMobile, left]);
  return (
    <>
      <div className="mb-16 relative flex justify-center items-center w-full bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border/50">
        <div
          style={{
            backgroundImage: "url('/opal.svg')",
            position: "absolute",
            top: "0px",
            width: "100%",
            height: "100%",
            backgroundRepeat: "repeat",
            backgroundSize: "600px 600px",
            left: "0px",
            opacity: 0.15,
          }}
        ></div>
        <div className="relative z-10 py-12 px-6 text-center">
          <img
            alt="Opal"
            title="Opal"
            src="/docs/opal-drawn.svg"
            className={cn("w-32 sm:w-48 mx-auto mb-6", { invert: mode === "dark" })}
          />
          <h1 className="text-5xl font-bold mb-4 text-foreground sr-only">Opal Documentation</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A local-first markdown editor and static publisher—offline-ready, Git-aware, with complete self-custody and
            zero backend dependencies.
          </p>
        </div>
      </div>

      <a
        href="https://github.com/rbbydotdev/opal"
        target="_blank"
        rel="noopener noreferrer"
        className="block border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 mb-8 hover:border-primary/50 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Github className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-foreground flex items-center gap-2 mb-1">
              View on GitHub
              <span className="text-xs font-mono text-muted-foreground">rbbydotdev/opal</span>
            </div>
            <p className="text-sm text-muted-foreground">Open source, self-hostable, and built for the long term</p>
          </div>
        </div>
      </a>

      {/* ========== 1. INTRODUCTION ========== */}
      <Section title="Introduction" id="introduction">
        <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6 mb-8">
          <h4 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
            <Lock className="text-primary" />
            Core Philosophy
          </h4>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Opal is built on three foundational principles: <strong>local-first</strong> architecture that keeps your
            data in your control, <strong>offline-ready</strong> capabilities powered by service workers, and{" "}
            <strong>complete ownership</strong> with no vendor lock-in. Your content stays yours
          </p>
        </div>

        <h4 className="font-semibold text-lg mb-4 text-foreground">Core Capabilities</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-medium">Browser-Native</span>
            </div>
            <p className="text-sm text-muted-foreground">Zero backend dependencies, works entirely in your browser</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-primary" />
              <span className="font-medium">Offline-First</span>
            </div>
            <p className="text-sm text-muted-foreground">Edit, build, and preview without internet connection</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <span className="font-medium">Git Integration</span>
            </div>
            <p className="text-sm text-muted-foreground">Full version control with GitHub support built-in</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-5 h-5 text-primary" />
              <span className="font-medium">One-Click Publishing</span>
            </div>
            <p className="text-sm text-muted-foreground">Deploy to Netlify, Vercel, Cloudflare, GitHub Pages, or S3</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-5 h-5 text-primary" />
              <span className="font-medium">Flexible Storage</span>
            </div>
            <p className="text-sm text-muted-foreground">IndexedDB, OPFS, or mounted local directories</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-medium">Self-Hostable</span>
            </div>
            <p className="text-sm text-muted-foreground">Open source and designed for the long term</p>
          </div>
        </div>
      </Section>

      {/* ========== 2. QUICK START ========== */}
      <Section title="Quick Start" subtitle="Get productive in minutes" id="quick-start">
        <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="w-6 h-6 text-primary shrink-0" />
            <h4 className="font-semibold text-lg text-card-foreground">Installation</h4>
          </div>
          <p className="text-muted-foreground mb-4">
            <strong>Option 1:</strong> Use the hosted version at{" "}
            <a href="https://opal.rbby.dev" className="text-primary hover:underline">
              opal.rbby.dev
            </a>
          </p>
          <p className="text-muted-foreground mb-4">
            <strong>Option 2:</strong> Run locally for development or self-hosting:
          </p>
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> git clone https://github.com/rbbydotdev/opal
            </div>
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> cd opal
            </div>
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> npm install
            </div>
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> npm run dev
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <PlusCircle className="w-7 h-7 text-primary shrink-0" />
              <h4 className="font-semibold text-lg text-card-foreground">Create Your First Workspace</h4>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <VideoPlayerFigure
                  src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/create-workspace/stream.m3u8"
                  thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/create-workspace/thumbnails.vtt"
                  title="Create Workspace"
                  caption="Step-by-step guide to creating your first workspace"
                />
              </div>

              <div>
                <p className="text-muted-foreground mb-6">
                  Workspaces are isolated environments where you can organize your content. Each workspace has its own
                  storage, settings, and Git configuration.
                </p>
                <h5 className="font-semibold mb-3 text-card-foreground">Storage Options</h5>
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded p-3">
                    <div className="font-medium text-sm mb-1">IndexedDB (Recommended)</div>
                    <div className="text-xs text-muted-foreground">Fast browser storage, perfect for most users</div>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <div className="font-medium text-sm mb-1">OPFS</div>
                    <div className="text-xs text-muted-foreground">In-browser filesystem for plugin support</div>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <div className="font-medium text-sm mb-1">Mounted OPFS</div>
                    <div className="text-xs text-muted-foreground">Real disk access, survives history clearing</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <GitBranch className="w-7 h-7 text-primary shrink-0" />
              <h4 className="font-semibold text-lg text-card-foreground">Connect to GitHub</h4>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                {/* */}
                <VideoPlayerFigure
                  src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/add-github-remote/stream.m3u8"
                  thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/add-github-remote/thumbnails.vtt"
                  caption="How to connect your workspace to GitHub"
                  title="Add GitHub Remote"
                />
              </div>
              <div>
                <p className="text-muted-foreground mb-6">
                  Add a GitHub remote to enable version control, collaboration, and cloud backup for your workspace.
                </p>
                <div className="bg-accent/10 border border-accent/50 rounded-lg p-6">
                  <h5 className="font-semibold mb-3 text-accent-foreground">Git Features</h5>
                  <ul className="space-y-2 text-sm text-accent-foreground/90">
                    <li>✓ Push and pull changes</li>
                    <li>✓ Branch management</li>
                    <li>✓ Commit history</li>
                    <li>✓ Merge conflicts resolution</li>
                    <li>✓ OAuth or personal access token auth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Rocket className="w-7 h-7 text-primary shrink-0" />
              <h4 className="font-semibold text-lg text-card-foreground">Build and Publish Your Site</h4>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <VideoPlayerFigure
                  src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/build-and-publish/stream.m3u8"
                  thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/build-and-publish/thumbnails.vtt"
                  caption="Complete workflow from build to live deployment"
                  title="Build and Publish"
                />
              </div>
              <div>
                <p className="text-muted-foreground mb-6">
                  Transform your markdown workspace into a static website and deploy it to your favorite hosting
                  platform in minutes.
                </p>
                <div className="bg-accent/10 border border-accent/50 rounded-lg p-6">
                  <h5 className="font-semibold mb-3 text-accent-foreground">Quick Steps</h5>
                  <ul className="space-y-2 text-sm text-accent-foreground/90">
                    <li>✓ Choose a build strategy (Freeform or Template)</li>
                    <li>✓ Compile your workspace to static HTML</li>
                    <li>✓ Add a deployment connection (GitHub, Netlify, Vercel, etc.)</li>
                    <li>✓ Configure your deployment target</li>
                    <li>✓ Publish and monitor deployment status</li>
                    <li>✓ Each build is saved with success/failure status for later recall</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Hammer className="w-7 h-7 text-primary shrink-0" />
            <h4 className="font-semibold text-lg text-card-foreground">Write Your First Document</h4>
          </div>
          <p className="text-muted-foreground mb-4">
            Once your workspace is created, start writing in markdown. Use rich text mode for a visual editing
            experience or source mode for direct markdown editing.
          </p>
          <DocImage src="/docs/hello-editor.svg" className="w-[40rem]" />
        </div>

        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-7 h-7 text-primary shrink-0" />
            <h4 className="font-semibold text-lg text-card-foreground">Preview Your Work</h4>
          </div>
          <p className="text-muted-foreground mb-4">
            See your markdown rendered in real-time with the preview pane. Toggle between side preview, full window, or
            print mode.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded p-4 text-center">
              <PanelRight className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium">Side Preview</div>
              <div className="text-xs text-muted-foreground mt-1">
                <kbd className="bg-muted px-1.5 py-0.5 rounded">{"Cmd/Ctrl + \\"}</kbd>
              </div>
            </div>
            <div className="bg-muted/30 rounded p-4 text-center">
              <Monitor className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium">Full Window</div>
              <div className="text-xs text-muted-foreground mt-1">External preview</div>
            </div>
            <div className="bg-muted/30 rounded p-4 text-center">
              <Printer className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-sm font-medium">Print/PDF</div>
              <div className="text-xs text-muted-foreground mt-1">Export to PDF</div>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-foreground">Next Steps</h4>
          <p className="text-muted-foreground mb-4">
            You're now ready to create content! Explore the sections below to learn about advanced features like Git
            integration, building, and publishing.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-primary" />
              Learn about the editor's powerful features
            </li>
            <li className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Set up version control with Git
            </li>
            <li className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              Build and publish your site
            </li>
          </ul>
        </div>
      </Section>

      {/* ========== 3. EDITOR & CONTENT CREATION ========== */}
      <Section title="Editor & Content Creation" subtitle="Powerful tools for writing and styling" id="editor">
        <SubSection title="Writing & Editing" id="writing-editing">
          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                  <MDIcon className="text-primary w-8 h-8" /> Markdown Editing
                </h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ Github Flavored Markdown syntax support</li>
                  <li>✓ Rich text mode with visual toolbar</li>
                  <li>✓ Source mode with CodeMirror 6</li>
                  <li>✓ Auto-save on every edit</li>
                  <li>
                    ✓ Switch modes with{" "}
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Cmd/Ctrl + ;</kbd>
                  </li>
                </ul>
              </div>
              <div className="flex justify-center items-center">
                <DocImage src="/docs/md-arrow.svg" className="max-w-72" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-card-foreground items-center flex gap-2">
                  <Edit className="text-primary" /> Rich Text Tools
                </h4>
                <p className="text-muted-foreground mb-4">
                  Structured editing with intuitive toolbar for headings, lists, dividers, and more.
                </p>
              </div>
              <DocImage src="/docs/rich-text-tools.svg" />
            </div>

            <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <History className="text-primary" />
                Edit History
              </h4>
              <p className="text-muted-foreground mb-4">
                Every change captured with browsable history. Preview and restore previous edits with confirmation.
              </p>
              <DocImage src="/docs/history-abbrv.svg" className="w-full" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
              <ListTree className="text-primary" /> Document Structure & Navigation
            </h4>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col justify-between">
                <p className="text-muted-foreground mb-4">
                  Visualize document hierarchy with the tree view. Click elements to navigate, drag to reorder sections.
                </p>
              </div>
              <DocImage src="/docs/markdown-tree.svg" className="w-96" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 my-8">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
              <ListTree className="text-primary" />
              Source Mode
            </h4>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex flex-col justify-between">
                <p className="text-muted-foreground mb-4">Edit markdown source directly with CodeMirror</p>
              </div>
              <DocImage src="/docs/hash-headings.svg" className="w-72" />
            </div>
          </div>
        </SubSection>

        {/* 
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <Code2 className="text-primary" /> Source Mode
              </h4>
              <p className="text-muted-foreground mb-4">Edit markdown source directly with CodeMirror</p>
              <DocImage src="/docs/hash-headings.svg" className="h-72" />
            </div> */}
        <SubSection title="Working with Images" id="images">
          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                  <Upload className="text-primary" /> Upload & Management
                </h4>
                <ul className="space-y-2 text-muted-foreground list-disc ml-8">
                  <li> Drop images from file manager</li>
                  <li> Paste directly into editor</li>
                  <li> Upload via sidebar</li>
                  <li> Automatic WebP conversion</li>
                  <li> Smart reference updates</li>
                  <li> Service worker caching</li>
                </ul>
              </div>
              <div>
                <DocImage src="/docs/add-image.svg" className="h-48" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <SquareDashed className="text-primary" /> Drag & Drop
              </h4>
              <p className="text-muted-foreground mb-4">
                Drag images directly into the editor for instant embedding with automatic optimization.
              </p>
              <DocImage src="/docs/dnd-image.svg" className="h-72" />
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/50 rounded-lg p-6 mt-8">
            <h5 className="font-semibold mb-3 text-accent-foreground flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-primary" />
              Why It Matters
            </h5>
            <p className="text-sm text-accent-foreground/90">
              Opal's complete image pipeline handles everything: automatic WebP conversion, smart reference tracking
              that updates markdown when images are renamed, service worker caching for instant loads, and even resize
              handles in the editor with automatic HTML tag conversion.
            </p>
          </div>
        </SubSection>

        <SubSection title="Preview & Styling" id="preview-styling">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <PanelRight className="text-primary" />
                Side Preview
              </h4>
              <div className="text-muted-foreground mb-2 text-sm">
                <Button size="sm" className="pointer-events-none">
                  Open Preview
                  <PanelRight className="!w-5 !h-5" strokeWidth={2} />
                </Button>
              </div>
              <div className="text-muted-foreground text-sm">
                Split-screen editing with live markdown preview. Toggle with{" "}
                <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono inline-block">{"Cmd/Ctrl + \\"}</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <Monitor className="text-primary" />
                Full Window
              </h4>
              <div className="text-muted-foreground mb-2 text-sm">
                <Button size="sm" className="pointer-events-none">
                  <Monitor className="!w-5 !h-5" strokeWidth={2} />
                </Button>
              </div>
              <div className="text-muted-foreground text-sm">
                Opens external preview window for dual-monitor workflows.
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <Printer className="text-primary" />
                Print Preview
              </h4>
              <div className="text-muted-foreground mb-2 text-sm">
                <Button size="sm" className="pointer-events-none">
                  Print / PDF
                  <Printer className="!w-4 !h-4" />
                </Button>
              </div>
              <div className="text-muted-foreground text-sm">Opens print dialog for PDF export or printing.</div>
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <Paintbrush className="text-primary" />
              CSS Document Styling
            </h4>
            <p className="text-muted-foreground mb-4">
              See live previews of your CSS styling and background patterns as you edit.
            </p>
            <VideoPlayerFigure
              src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/preview-css-background/stream.m3u8"
              thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/preview-css-background/thumbnails.vtt"
              title="Preview CSS Styling"
              caption="Preview CSS Styling"
              className="max-w-[600px]"
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
              <FileCode className="text-primary" />
              Global Styles
            </h4>
            <p className="text-muted-foreground mb-4">
              Create a <code className="bg-muted px-1.5 py-0.5 rounded">global.css</code> file in your root directory to
              style all markdown documents in Freeform mode.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>✓ Built-in themes: Pico CSS and GitHub CSS</li>
              <li>✓ Sibling CSS files for local overrides</li>
              <li>✓ Different rules for template vs. Freeform builds</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
              <Palette className="text-primary" />
              Themes
            </h4>
            <p className="text-muted-foreground mb-4">
              Switch between light, dark, and system modes. Choose from multiple built-in themes via the stone menu or
              command palette.
            </p>
            <VideoPlayerFigure
              src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/theme-select/stream.m3u8"
              thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/theme-select/thumbnails.vtt"
              title="Theme Select"
              className="max-w-[600px] my-4"
            />
            <ImageWithViewer src="/themes.png" alt="Theme options" />
          </div>
        </SubSection>
      </Section>

      {/* ========== 4. WORKSPACE MANAGEMENT ========== */}
      <Section title="Workspace Management" subtitle="Organized, searchable, and flexible" id="workspace">
        <SubSection title="File Organization" id="file-organization">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 flex justify-between flex-col">
              <div>
                <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
                  <FolderTree className="text-primary" />
                  File Tree
                </h4>
                <p className="text-muted-foreground mb-4">
                  Drag and drop files between directories. Rename with Enter, delete with Backspace. Full keyboard
                  navigation support.
                </p>
              </div>
              <DocImage src="/docs/file-tree.svg" className="h-72" />
            </div>

            <div className="bg-card border border-border rounded-lg p-6 flex justify-between flex-col">
              <div>
                <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
                  <Trash2Icon className="text-primary" />
                  Trash Management
                </h4>
                <p className="text-muted-foreground mb-4">
                  Deleted files move to Trash where they can be restored or permanently deleted. Files in Trash are
                  excluded from Git.
                </p>
              </div>
              <div className="h-full flex justify-center items-center">
                <DocImage src="/docs/trash-banner.svg" className="h-48" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-accent rounded-lg p-6 mt-8">
            <h4 className="font-semibold text-lg mb-3 text-accent-foreground">Sidebar Features</h4>
            <div className="grid md:grid-cols-2 gap-6 text-accent-foreground/90">
              <ul className="space-y-2 list-disc ml-4">
                <li> Drag and drop to reorder sections</li>
                <li> Resize sidebar by dragging divider</li>
                <li>
                  Toggle with <kbd>Cmd/Ctrl + B</kbd>
                </li>
              </ul>
              <ul className="space-y-2 list-disc ml-4">
                <li>
                  Hold <kbd>Cmd/Ctrl</kbd> for quick toggles
                </li>
                <li> Layout remembered between sessions</li>
                <li> Multiple section types available</li>
              </ul>
            </div>
          </div>
        </SubSection>

        <SubSection title="Stock Files" id="stock-files">
          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-primary shrink-0" />
              <h4 className="font-semibold text-lg text-card-foreground">Quick Start Templates</h4>
            </div>
            <p className="text-muted-foreground mb-6">
              Stock files are pre-filled templates with full usage examples to help you get started quickly. Access them
              from the file menu sidebar, context menu actions, or right-click menu in the file tree.
            </p>

            <h5 className="font-semibold mb-3 text-card-foreground">Available Stock Files</h5>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileCode2Icon className="w-4 h-4 text-primary" />
                  global.css
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Pre-configured global styles for your workspace. Available in two variants:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                  <li>GitHub-style markdown CSS</li>
                  <li>Pico.css minimal framework</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  index.html
                </div>
                <p className="text-xs text-muted-foreground">
                  Basic HTML5 boilerplate with proper structure and meta tags for quick prototyping.
                </p>
              </div>

              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4 text-primary" />
                  Template Files
                </div>
                <p className="text-xs text-muted-foreground mb-2">Example templates for static site generation:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                  <li>template.mustache - Mustache syntax</li>
                  <li>template.ejs - EJS syntax</li>
                  <li>template.njk - Nunjucks syntax</li>
                  <li>template.liquid - Liquid syntax</li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  manifest.json
                </div>
                <p className="text-xs text-muted-foreground">
                  Template import manifest for sharing your workspace. Defines workspace metadata and entry point for
                  GitHub template imports.
                </p>
              </div>

              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4 text-primary" />
                  data.json
                </div>
                <p className="text-xs text-muted-foreground">Empty JSON object starter for template data files.</p>
              </div>
            </div>

            <h5 className="font-semibold mb-3 text-card-foreground">How to Use</h5>
            <div className="space-y-3 text-muted-foreground text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <strong className="text-card-foreground">From Sidebar:</strong> Click the{" "}
                  <Package className="inline w-4 h-4" /> Stock Files button in the file menu actions
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <strong className="text-card-foreground">From Context Menu:</strong> Right-click in the file tree and
                  select <strong>Stock Files</strong> from the menu
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <strong className="text-card-foreground">Choose Your Template:</strong> Select the stock file you need
                  and it will be created in the current directory with full example content
                </div>
              </div>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/50 rounded-lg p-6">
            <h5 className="font-semibold mb-3 text-accent-foreground flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-primary" />
              Why Use Stock Files?
            </h5>
            <p className="text-sm text-accent-foreground/90">
              Stock files save you from starting with empty files or searching for syntax examples. Each file comes
              pre-populated with working examples and proper syntax, helping you understand how to use features like
              templates, CSS frameworks, and workspace sharing without leaving the editor.
            </p>
          </div>
        </SubSection>

        <SubSection title="Search & Navigation" id="search-navigation">
          {/* <div className="grid md:grid-cols-2 gap-8 bg-card p-4 rounded-lg border">
        <div>
          <h4 className="font-semibold text-lg mb-4 text-card-foreground">Global Search</h4>
          <p className="text-muted-foreground mb-4">
            Search across all files with regex support. Keyboard shortcut Cmd/Ctrl + P for spotlight search with fuzzy
            matching.
          </p>
          <DocImage src="/docs/search-doc.svg" className="h-72" />
        </div>

        <div>
          <h4 className="font-semibold text-lg mb-4 text-card-foreground">Stone Menu</h4>
          <p className="text-muted-foreground mb-4">
            Quick access to theme switching, developer mode, zoom controls, and workspace management.
          </p>
          <DocImage src="/docs/stone-menu.svg" className="h-72" />
        </div>
      </div> */}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 flex justify-between flex-col">
              <div>
                <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
                  <Search className="text-primary" />
                  Global Search
                </h4>
                <p className="text-muted-foreground mb-4">
                  Search across all files with regex support. Use{" "}
                  <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono inline-block">
                    Shift + Cmd/Ctrl + F
                  </span>
                  to open search.
                </p>
              </div>
              <DocImage src="/docs/search-doc.svg" className="h-72" />
            </div>

            <div className="bg-card border border-border rounded-lg p-6 flex justify-between flex-col">
              <div>
                <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
                  <Menu className="text-primary" />
                  Stone Menu
                </h4>
                <p className="text-muted-foreground mb-4">
                  Quick access to theme switching, developer mode, zoom controls, and workspace management.
                </p>
              </div>
              <div className="h-full flex justify-center items-center">
                <DocImage src="/docs/stone-menu-2.svg" className="h-72" />
              </div>
            </div>
          </div>

          <VideoPlayerFigure
            caption="Searching across all files in the workspace with regex support"
            src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/search-across-workspaces/stream.m3u8"
            thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/search-across-workspaces/thumbnails.vtt"
            title="Search Across Workspaces"
            className="max-w-[600px]"
          />

          <div className="bg-accent/20 border border-accent rounded-lg p-6 mt-8">
            <h4 className="font-semibold text-lg mb-3 text-accent-foreground flex items-center gap-2">
              <Command className="w-5 h-5 text-primary" />
              Command Palette
            </h4>
            <p className="text-accent-foreground/90 mb-4 text-sm">
              Press{" "}
              <span className="bg-accent/30 px-1.5 py-0.5 rounded text-xs font-mono inline-block">
                <kbd>Cmd/Ctrl + P</kbd>
              </span>{" "}
              to open Spotlight. Search for files by name <b>OR</b> type{" "}
              <span className="bg-accent/30 px-1.5 py-0.5 rounded text-xs font-mono">&gt;</span> to access commands:
            </p>
            <ul className="space-y-2 text-accent-foreground/90 text-sm">
              <li className="flex items-center gap-2">
                <CirclePlus className="w-4 h-4 flex-shrink-0 text-primary" />
                Create files, commit changes, initialize Git
              </li>
              <li className="flex items-center gap-2">
                <Palette className="w-4 h-4 flex-shrink-0 text-primary" />
                Change themes, manage workspaces
              </li>
              <li className="flex items-center gap-2">
                <Filter className="w-4 h-4 flex-shrink-0 text-primary" />
                Multi-step prompts with contextual filtering
              </li>
              <li className="flex items-center gap-2">
                <Search className="w-4 h-4 flex-shrink-0 text-primary" />
                Cross-workspace file search with fuzzy matching
              </li>
            </ul>
          </div>

          <div className="bg-accent/10 border border-accent/50 rounded-lg p-6 mt-8">
            <h5 className="font-semibold mb-3 text-accent-foreground flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-primary" />
              Why It Matters
            </h5>
            <p className="text-sm text-accent-foreground/90">
              Cross-workspace search runs in a service worker off the main thread, keeping the UI responsive. With regex
              support and fuzzy file matching, you can find anything across all your projects instantly.
            </p>
          </div>
        </SubSection>

        <SubSection title="Storage Options" id="storage-options">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <FeatureCard
              title="IndexedDB"
              icon={Zap}
              description="Fast, persistent browser storage recommended for most users. Survives browser sessions but not history clearing."
            />
            <FeatureCard
              title="OPFS"
              icon={HardDrive}
              description="In-browser filesystem useful with OPFS file browser plugins. Slower than IndexedDB but still fully browser-based."
            />
            <FeatureCard
              title="Mounted OPFS"
              icon={Download}
              description="Direct access to a local directory with real disk persistence. Only storage type that survives browser history clearing."
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground items-center gap-2 flex">
              <OpalSvg className="rounded-full" /> Workspace Features
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <ul className="space-y-2 text-muted-foreground list-disc ml-4">
                <li> Isolated workspaces with custom names</li>
                <li> Colored multi-shape identicons</li>
                <li> Right-click for rename/delete options</li>
                <li> Collapsible workspace bar</li>
              </ul>
              <ul className="space-y-2 text-muted-foreground list-disc ml-4">
                <li> Cross-tab syncing via BroadcastChannel</li>
                <li> Badge indicators for errors</li>
                <li> Drag-to-resize functionality</li>
                <li> Storage type fixed after creation</li>
              </ul>
            </div>
          </div>
        </SubSection>

        <SubSection title="Template Imports" id="template-imports">
          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-6 h-6 text-primary shrink-0" />
              <h4 className="font-semibold text-lg text-card-foreground">Import Templates from GitHub</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              Quickly bootstrap new workspaces by importing templates from public GitHub repositories. This makes
              sharing starter projects and templates effortless.
            </p>
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h5 className="font-semibold mb-2 text-card-foreground text-sm">URL Format</h5>
              <code className="text-sm font-mono text-accent-foreground block">
                opaledx.com/import/gh/&lt;owner&gt;/&lt;reponame&gt;/&lt;optional: branch&gt;
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                If branch is not specified, the default branch will be used, falling back to "main"
              </p>
            </div>

            <h5 className="font-semibold mb-3 text-card-foreground">How It Works</h5>
            <ol className="space-y-3 mb-6 list-decimal ml-8 text-muted-foreground">
              <li>Navigate to the import URL with a public GitHub repository</li>
              <li>Opal fetches the manifest file from the repository root</li>
              <li>You'll be prompted to confirm the import</li>
              <li>A new workspace is created automatically using IndexedDB storage</li>
              <li>After import completes, you'll be navigated to the file specified in the manifest</li>
            </ol>

            <div className="bg-accent/10 border border-accent/50 rounded-lg p-4 mb-6">
              <h5 className="font-semibold mb-2 text-accent-foreground text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" />
                Manifest File Requirements
              </h5>
              <p className="text-xs text-accent-foreground/90 mb-3">
                Include a manifest file in your repository root with the following structure:
              </p>
              <div className="bg-accent/20 rounded p-3">
                <code className="text-xs font-mono block">
                  {`{
  "version": 1,
  "type": "template",
  "navigate": "path/to/file.md"
}`}
                </code>
              </div>
            </div>

            {/* <div className="bg-card border-2 border-accent/30 rounded-lg p-5">
            <h5 className="font-semibold mb-3 text-card-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Notes
            </h5>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">⚠</span>
                <span>Only import templates from sources you trust</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">✓</span>
                <span>All HTML, markdown, and SVG content is sanitized</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0">ℹ</span>
                <span>Templates are imported into an isolated IndexedDB workspace</span>
              </li>
            </ul>
          </div> */}
          </div>

          <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6">
            <h5 className="font-semibold mb-3 text-foreground flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-primary" />
              Why Use Template Imports?
            </h5>
            <p className="text-muted-foreground mb-4">
              Template imports make sharing Opal projects seamless. Instead of manually setting up a Git repository and
              pulling it down, users can click a single link and have a fully configured workspace ready to edit.
            </p>
            <p className="text-muted-foreground text-sm">
              Perfect for documentation starters, blog templates, portfolio sites, or sharing example projects with new
              Opal users.
            </p>
          </div>
        </SubSection>
      </Section>

      {/* ========== 5. VERSION CONTROL WITH GIT ========== */}
      <Section title="Version Control with Git" subtitle="Practical version control without complexity" id="git">
        <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
          <h4 className="font-semibold text-lg mb-4 text-card-foreground">Core Git Actions</h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-center mb-2">
                <ArrowDown className="w-6 h-6 text-primary" />
              </div>
              <div className="font-semibold text-primary">Pull</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-center mb-2">
                <ArrowUp className="w-6 h-6 text-primary" />
              </div>
              <div className="font-semibold text-primary">Push</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-center mb-2">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div className="font-semibold text-primary">Sync</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-center mb-2">
                <Save className="w-6 h-6 text-primary" />
              </div>
              <div className="font-semibold text-primary">Commit</div>
            </div>
          </div>
        </div>

        <div className="bg-accent/20 border border-accent rounded-lg p-6 mb-8">
          <ul className="space-y-2 text-accent-foreground/90">
            <li className="flex items-center gap-2">
              <Link className="w-4 h-4 flex-shrink-0 text-primary" />
              Add remote connections via sidebar (GitHub, etc.)
            </li>
            <li className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 flex-shrink-0 text-primary" />
              Branch management with merge support
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 text-primary" />
              Main and Master branches protected from deletion
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-4 h-4 flex-shrink-0 text-primary" />
              Connections shared across all workspaces
            </li>
            <li className="flex items-center gap-2">
              <Settings className="w-4 h-4 flex-shrink-0 text-primary" />
              Support for custom Git servers with CORS configuration
            </li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
          <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
            <GitMerge className="text-primary" />
            Conflict Resolution
          </h4>
          <p className="text-muted-foreground mb-4">
            When merge conflicts occur, Opal provides a visual editor to resolve them directly in the browser. Choose
            between incoming changes, current changes, or edit manually to resolve conflicts.
          </p>
          <DocImage src="/docs/git-version-control.svg" className="w-[40rem]" />
        </div>

        <div className="bg-accent/10 border border-accent/50 rounded-lg p-6">
          <h5 className="font-semibold mb-3 text-accent-foreground flex items-center gap-2">
            <Sparkle className="w-5 h-5 text-primary" />
            Why It Matters
          </h5>
          <p className="text-sm text-accent-foreground/90">
            Opal speaks the Git protocol directly in the browser using isomorphic-git. This isn't a Git-like
            interface—it's real Git with full push, pull, branch, merge, and conflict resolution capabilities. Works
            with GitHub out of the box, and potentially with other Git servers via CORS proxy.
          </p>
        </div>
      </Section>

      {/* ========== 6. BUILDING & PUBLISHING ========== */}
      <Section title="Building & Publishing" subtitle="From workspace to live site" id="building-publishing">
        <div className="bg-accent/10 border border-accent/50 rounded-lg p-6 mb-8">
          <h4 className="font-semibold text-lg mb-4 text-accent-foreground">Complete Build & Deploy Workflow</h4>
          <p className="text-accent-foreground/90 mb-4">
            Opal makes it easy to compile your markdown workspace into static HTML and deploy to your favorite hosting
            platform. Follow these steps to go from local content to published site.
          </p>
        </div>

        {/* Step-by-step cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-card border-2 border-primary/30 rounded-lg p-6 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex justify-center mb-4">
              <Hammer className="w-12 h-12 text-primary" />
            </div>
            <h4 className="font-semibold text-center mb-3 text-card-foreground">Build Your Project</h4>
            <p className="text-sm text-muted-foreground text-center">
              Select a build strategy and compile your workspace to static HTML
            </p>
          </div>

          <div className="bg-card border-2 border-primary/30 rounded-lg p-6 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex justify-center mb-4">
              <Link className="w-12 h-12 text-primary" />
            </div>
            <h4 className="font-semibold text-center mb-3 text-card-foreground">Add a Connection</h4>
            <p className="text-sm text-muted-foreground text-center">
              Connect your preferred hosting platform with OAuth or API keys
            </p>
          </div>

          <div className="bg-card border-2 border-primary/30 rounded-lg p-6 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex justify-center mb-4">
              <Settings className="w-12 h-12 text-primary" />
            </div>
            <h4 className="font-semibold text-center mb-3 text-card-foreground">Configure Target</h4>
            <p className="text-sm text-muted-foreground text-center">
              Set up your deployment destination with platform-specific settings
            </p>
          </div>

          <div className="bg-card border-2 border-primary/30 rounded-lg p-6 relative">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex justify-center mb-4">
              <Rocket className="w-12 h-12 text-primary" />
            </div>
            <h4 className="font-semibold text-center mb-3 text-card-foreground">Publish</h4>
            <p className="text-sm text-muted-foreground text-center">
              Deploy your site and monitor the live status with real-time feedback
            </p>
          </div>
        </div>

        {/* Detailed step sections */}
        <div className="space-y-8">
          {/* Step 1: Build */}
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Hammer className="text-primary" />
                  Build Your Project
                </h3>
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_400px] gap-8">
              <div>
                <h5 className="font-semibold mb-3 text-card-foreground">Build Strategies</h5>
                <div className="space-y-3 mb-6">
                  <div className="bg-muted/50 rounded p-4">
                    <div className="font-medium text-sm mb-1">Freeform</div>
                    <div className="text-xs text-muted-foreground">
                      Compiles markdown files in place with sibling CSS. Global styles from{" "}
                      <code className="bg-muted px-1 py-0.5 rounded">global.css</code> applied to all files.
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-4">
                    <div className="font-medium text-sm mb-1">Template (11ty-style)</div>
                    <div className="text-xs text-muted-foreground">
                      Advanced compilation for complex structures with template support and directory-based rules.
                    </div>
                  </div>
                </div>

                <h5 className="font-semibold mb-3 text-card-foreground">Build Management</h5>
                <ul className="space-y-2 text-muted-foreground text-sm list-disc ml-4">
                  <li>Each build saved separately with success/failure status</li>
                  <li>Multiple builds can exist simultaneously</li>
                  <li>Access build history in the builds list</li>
                  <li>
                    Multi-select builds with <kbd className="bg-muted px-1.5 py-0.5 rounded text-xs">Cmd/Ctrl</kbd> +
                    click for batch operations
                  </li>
                  <li>Download builds as encrypted or unencrypted ZIP files</li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <DocImage src="/docs/my-build-2.svg" className="w-full" />
              </div>
            </div>
          </div>

          {/* Step 2: Connections */}
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Link className="text-primary" />
                  Add a Connection
                </h3>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              Connections store your credentials for deployment platforms. Add them once and use across all workspaces.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h5 className="font-semibold mb-3 text-card-foreground">Where to Add</h5>
                <ul className="space-y-2 text-muted-foreground text-sm list-disc ml-4">
                  <li>From the sidebar Connections section</li>
                  <li>Directly in the Build modal</li>
                  <li>Reuse existing connections from Git remotes (GitHub)</li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-3 text-card-foreground">Supported Platforms</h5>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Github className="w-3 h-3" /> GitHub
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Netlify
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Vercel
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Cloudflare Pages
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> AWS S3
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-accent/10 border border-accent/50 rounded p-4">
              <p className="text-sm text-accent-foreground/90">
                <strong>Shared Across Workspaces:</strong> Connections are global and available to all your workspaces,
                making it easy to deploy multiple projects to the same platform.
              </p>
            </div>
          </div>

          {/* Step 3: Deployment Targets */}
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Settings className="text-primary" />
                  Configure Deployment Target
                </h3>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              Deployment targets link your connection to a specific destination with platform-specific settings.
            </p>

            <h5 className="font-semibold mb-4 text-card-foreground">Platform-Specific Settings</h5>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Github className="w-4 h-4 text-primary" /> GitHub Pages
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Repository name</li>
                  <li>Target branch (e.g., gh-pages)</li>
                  <li>Root path (defaults to repo name)</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" /> Netlify
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Site name</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" /> Vercel
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Project name</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" /> Cloudflare
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Pages project</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded p-4">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary" /> AWS S3
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Public bucket name</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/30 rounded p-4">
              <h5 className="font-semibold mb-2 text-card-foreground text-sm">Search or Create</h5>
              <p className="text-xs text-muted-foreground">
                Use the magnifying glass icon to search existing remote targets or the plus icon to create new ones
                directly from Opal.
              </p>
            </div>
          </div>

          {/* Step 4: Publish */}
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
                4
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                  <Rocket className="text-primary" />
                  Publish Your Site
                </h3>
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_400px] gap-8">
              <div>
                <p className="text-muted-foreground mb-6">
                  Once your build is complete and your deployment target is configured, you're ready to publish.
                </p>

                <h5 className="font-semibold mb-3 text-card-foreground">Publishing Process</h5>
                <ul className="space-y-2 text-muted-foreground text-sm list-disc ml-4 mb-6">
                  <li>Click the Publish button in the Build modal</li>
                  <li>Deployment process begins and logs in real-time</li>
                  <li>Success or failure notification displays</li>
                  <li>View button appears with live status spinner</li>
                </ul>

                <h5 className="font-semibold mb-3 text-card-foreground">Site Status Monitoring</h5>
                <p className="text-muted-foreground text-sm mb-3">
                  The View button includes a spinner that polls your site's favicon to detect when it's live. This helps
                  you know when your deployment is fully propagated.
                </p>
                <div className="bg-accent/10 border border-accent/50 rounded p-3">
                  <p className="text-xs text-accent-foreground/90">
                    <strong>Note:</strong> Favicon polling won't work for private sites, but you can still use the View
                    button to open your deployment URL.
                  </p>
                </div>

                <h5 className="font-semibold mb-3 text-card-foreground mt-6">Deployment Logs</h5>
                <p className="text-muted-foreground text-sm">
                  All deployment attempts are saved with detailed logs. Access them in the Deployment tab to review past
                  publishes, debug issues, or track your deployment history.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <DocImage src="/docs/publish-providers-2.svg" className="w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick reference */}
        <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6 mt-8">
          <h4 className="font-semibold text-lg mb-4 text-foreground">Quick Reference</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium mb-2 text-card-foreground text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Download Builds
              </h5>
              <p className="text-xs text-muted-foreground">
                Don't need to deploy? Download any build as a ZIP file (encrypted or unencrypted) for manual hosting or
                archival.
              </p>
            </div>
            <div>
              <h5 className="font-medium mb-2 text-card-foreground text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Build History
              </h5>
              <p className="text-xs text-muted-foreground">
                Every build is preserved with its status. Roll back to previous builds or compare different versions
                anytime.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ========== 7. SELF-HOSTING & ADVANCED ========== */}
      <Section title="Self-Hosting & Advanced" subtitle="Deploy your own instance and dive deep" id="advanced">
        <SubSection title="Self-Hosting Opal" id="self-hosting">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <Server className="text-primary" />
                Static Hosting
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run build</code> and serve the{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">dist</code> directory with any static file
                server.
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>✓ Host on Vercel, Cloudflare Pages, Netlify</li>
                <li>✓ Use your own domain</li>
                <li>✓ No server-side setup required</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
                <Network className="text-primary" />
                CORS Proxy
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                For production, deploy your own CORS proxies using included Wrangler CLI configuration.
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>✓ Default Cloudflare proxy included</li>
                <li>✓ Add your domain to whitelist</li>
                <li>✓ Simple configuration provided</li>
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
              <Settings className="text-primary" />
              Configuration Steps
            </h4>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="font-medium text-card-foreground">1. Configure OAuth Apps</span>
                </div>
                <p className="text-muted-foreground text-sm ml-6 mb-2">
                  Create OAuth apps with GitHub, Netlify, and Vercel. Copy{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">.env.example</code> to{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> and update your client IDs:
                </p>
                <div className="ml-6 bg-muted/30 rounded p-3">
                  <code className="text-xs font-mono block space-y-1">
                    <div>
                      <span className="text-muted-foreground">VITE_PUBLIC_GITHUB_CLIENT_ID=</span>
                      <span className="text-accent-foreground">your_github_id</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">VITE_PUBLIC_NETLIFY_CLIENT_ID=</span>
                      <span className="text-accent-foreground">your_netlify_id</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">VITE_PUBLIC_VERCEL_CLIENT_ID=</span>
                      <span className="text-accent-foreground">your_vercel_id</span>
                    </div>
                  </code>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Network className="w-4 h-4 text-primary" />
                  <span className="font-medium text-card-foreground">2. Deploy Proxies</span>
                </div>
                <div className="ml-6 space-y-4">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">Update allowed origins in proxy source files:</p>
                    <div className="space-y-2">
                      <div className="bg-muted/30 rounded p-3">
                        <div className="font-mono text-xs mb-1 text-muted-foreground">
                          proxies/all-api-proxy/src/index.ts:8
                        </div>
                        <code className="text-xs font-mono">
                          <span className="text-muted-foreground">const</span> ALLOWED_ORIGINS ={" "}
                          <span className="text-accent-foreground">["https://yourdomain.com"]</span>
                        </code>
                      </div>
                      <div className="bg-muted/30 rounded p-3">
                        <div className="font-mono text-xs mb-1 text-muted-foreground">
                          proxies/git-protocol-proxy/src/index.ts:1
                        </div>
                        <code className="text-xs font-mono">
                          <span className="text-muted-foreground">const</span> ALLOWED_REFERRERS ={" "}
                          <span className="text-accent-foreground">["https://yourdomain.com"]</span>
                        </code>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">
                      Deploy proxies with Cloudflare Wrangler and set OAuth client secrets as environment variables:
                    </p>
                    <div className="bg-muted/30 rounded p-3">
                      <code className="text-xs font-mono block space-y-1">
                        <div>GITHUB_CLIENT_SECRET</div>
                        <div>NETLIFY_CLIENT_SECRET</div>
                        <div>VERCEL_CLIENT_SECRET</div>
                      </code>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">
                      Update your <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> file to point to
                      your deployed proxies:
                    </p>
                    <div className="bg-muted/30 rounded p-3">
                      <code className="text-xs font-mono block space-y-1">
                        <div>
                          <span className="text-muted-foreground">VITE_GIT_PROTOCOL_PROXY=</span>
                          <span className="text-accent-foreground">https://your-git-proxy.workers.dev</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">VITE_CORS_PROXY=</span>
                          <span className="text-accent-foreground">https://your-api-proxy.workers.dev</span>
                        </div>
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Sparkle className="text-primary" /> Future-Proof Design
            </h4>
            <p className="text-muted-foreground">
              Zip up Opal dist with project files for use years later. Browser backward compatibility and no vendor
              lock-in ensure your content remains accessible.
            </p>
          </div>
        </SubSection>

        <SubSection title="Technical Deep Dives" id="technical">
          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
              <Activity className="text-primary" />
              Service Workers
            </h4>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h5 className="font-semibold mb-3 text-card-foreground text-sm">Core Functionality</h5>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <Database className="w-4 h-4 flex-shrink-0 text-primary" />
                    Image and file caching with Cache API
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 flex-shrink-0 text-primary" />
                    Direct storage serving for speed
                  </li>
                  <li className="flex items-center gap-2">
                    <Network className="w-4 h-4 flex-shrink-0 text-primary" />
                    RPC-like communication with Hono
                  </li>
                  <li className="flex items-center gap-2">
                    <Settings className="w-4 h-4 flex-shrink-0 text-primary" />
                    Intelligent resource management
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-3 text-card-foreground text-sm">Performance Benefits</h5>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <Image className="w-4 h-4 flex-shrink-0 text-primary" />
                    Snappy image loading with shared memory
                  </li>
                  <li className="flex items-center gap-2">
                    <Moon className="w-4 h-4 flex-shrink-0 text-primary" />
                    Automatic sleep/idle for efficiency
                  </li>
                  <li className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 flex-shrink-0 text-primary" />
                    Compiled markdown caching
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 flex-shrink-0 text-primary" />
                    Reduced external network calls
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6">
            <h4 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
              <Zap className="text-primary" />
              Performance Optimizations
            </h4>
            <p className="text-muted-foreground mb-4">
              Performance isn't an afterthought—it's built into every layer of Opal.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 flex-shrink-0 text-primary" />
                  React Compiler optimization for minimal re-renders
                </li>
                <li className="flex items-center gap-2">
                  <Database className="w-4 h-4 flex-shrink-0 text-primary" />
                  Service worker caching keeps everything fast
                </li>
                <li className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 flex-shrink-0 text-primary" />
                  CodeMirror 6 for performant source editing
                </li>
              </ul>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex items-center gap-2">
                  <Edit className="w-4 h-4 flex-shrink-0 text-primary" />
                  Lexical-based rich text editor (via mdx-editor)
                </li>
                <li className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 flex-shrink-0 text-primary" />
                  All data and images stored locally for instant access
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="w-4 h-4 flex-shrink-0 text-primary" />
                  Off-main-thread processing with service workers
                </li>
              </ul>
            </div>
          </div>
        </SubSection>

        <SubSection title="Keyboard Reference" id="keyboard-reference">
          <div className="bg-card border border-border rounded-lg p-2 md:p-6 mb-8">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground">Essential Shortcuts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Focus sidebar</span>
                <span className="bg-primary/20 px-2 py-1 rounded text-xs font-mono">
                  <kbd>Esc × 2</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Spotlight / Commands</span>
                <span className="bg-primary/20 px-2 py-1 rounded text-xs font-mono">
                  <kbd>Cmd/Ctrl + P</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Toggle sidebar</span>
                <span className="bg-primary/20 px-2 py-1 rounded text-xs font-mono">
                  <kbd>Cmd/Ctrl + B</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Switch rich text and source mode</span>
                <span className="bg-primary/20 px-2 py-1 rounded text-xs font-mono">
                  <kbd>Cmd/Ctrl + ;</kbd>
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm">Show preview</span>
                <span className="bg-primary/20 px-2 py-1 rounded text-xs font-mono">
                  <kbd>Cmd/Ctrl + /</kbd>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h4 className="font-semibold text-lg mb-4 text-card-foreground">Complete Shortcut List</h4>
            <p className="text-muted-foreground mb-4">
              Click the <strong>Shortcuts</strong> button in the workspace button bar to view the complete list of
              keyboard shortcuts and commands available in Opal.
            </p>
            <div className="flex justify-center">
              <div className="w-20 py-2 gap-2 flex-col border-l-2 border-transparent flex items-center text-muted-foreground stroke-muted-foreground pointer-events-none opacity-90">
                <div className="flex items-center justify-center flex-col w-full">
                  <div className="flex items-center justify-center w-8 h-8">
                    <KeyboardIcon strokeWidth="1" stroke="current" className="w-full h-full" />
                  </div>
                  <div className="uppercase pt-2 text-center w-full text-3xs">shortcuts</div>
                </div>
              </div>
            </div>
          </div>
        </SubSection>
      </Section>
    </>
  );
};
