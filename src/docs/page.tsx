import { OpalSvg } from "@/components/OpalSvg";
import { Button } from "@/components/ui/button";
import MDIcon from "@/icons/md.svg?react";
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
  Keyboard,
  KeyboardIcon,
  Link,
  ListTree,
  Lock,
  Menu,
  Monitor,
  Moon,
  Network,
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
import { ImageWithViewer } from "./ImageWithViewer";
import { VideoPlayer, VideoPlayerFigure } from "./VideoPlayer";
export const DocImage = ({ src, className, ...props }: { src: string; className?: string }) => (
  <div
    className="relative flex justify-center"
    style={{
      position: "relative",
    }}
  >
    <img
      className={cn("p-4 w-full #max-w-2xl relative #border-2 #border-border rounded-lg", className)}
      src={src}
      {...props}
    />
  </div>
);

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

export const DocsPageBody = () => (
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
        <img alt="Opal" title="Opal" src="/docs/opal-drawn.svg" className="w-48 mx-auto mb-6" />
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

    {/* <div className=" border-primary bg-accent/30 border rounded-lg p-6 mb-12">
      <p className="text-base leading-relaxed text-accent-foreground">
        <strong>Local‑first, powered by modern browser storage and service workers</strong> — fast, offline‑friendly,
        and Git‑aware. Your content stays yours with zero backend dependencies.
      </p>
    </div> */}

    <Section title="Key Features" subtitle="Everything you need for modern content creation">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCard
          title="One-Click Publishing"
          icon={Rocket}
          description="Deploy instantly to Netlify, Cloudflare Pages, AWS S3, GitHub Pages, or Vercel using OAuth or API key authentication. No complex build pipelines required."
        />
        <FeatureCard
          title="Browser-Native"
          icon={Zap}
          description="Zero backend dependencies — everything lives in your browser. Projects stored in IndexedDB or mounted to local directories. No server required."
        />
        <FeatureCard
          title="Flexible Storage"
          icon={HardDrive}
          description="Choose between browser storage, OPFS, or mounted local directories with real disk persistence. Mix and match per workspace."
        />
        <FeatureCard
          title="Offline-First"
          icon={Wifi}
          description="Service worker-powered caching means Opal works completely offline. Edit, build, and preview without an internet connection."
        />
        <FeatureCard
          title="Complete Ownership"
          icon={Lock}
          description="Your content stays yours. Self-hostable, open source, and designed to work years into the future with no vendor lock-in."
        />
        <FeatureCard
          title="Git Integration"
          icon={GitBranch}
          description="Built-in Git support for version control, branching, merging, and syncing with remote repositories like GitHub."
        />
      </div>
    </Section>

    <Section title="Getting Started" subtitle="Quick tutorials to help you get up and running">
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Terminal className="w-6 h-6 text-primary shrink-0" />
          <h4 className="font-semibold text-lg text-card-foreground">Run Opal Locally</h4>
        </div>
        <p className="text-muted-foreground mb-4">
          Clone the repository and run Opal on your local machine for development or self-hosting.
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
            <span className="text-primary">$</span> npm run dev{" "}
            <span className="text-muted-foreground/60"># or npm run build</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Cloud className="w-6 h-6 text-primary shrink-0" />
          <h4 className="font-semibold text-lg text-card-foreground">Deploy Opal</h4>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="font-medium text-card-foreground">1. Static Site</span>
            </div>
            <p className="text-muted-foreground text-sm ml-6">
              Deploy to any static host (Vercel, Cloudflare Pages, Netlify). Build and upload the{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">dist</code> directory.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-primary" />
              <span className="font-medium text-card-foreground">2. Configure OAuth Apps</span>
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
              <span className="font-medium text-card-foreground">3. Deploy Proxies</span>
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
                  Update your <code className="bg-muted px-1 py-0.5 rounded text-xs">.env</code> file to point to your
                  deployed proxies:
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

      <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6 mb-8">
        <h4 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
          <Zap className="text-primary" />
          Quick Start
        </h4>
        <ul className="space-y-4 text-muted-foreground">
          <li>
            <div className="flex gap-2 items-center">
              <PlusCircle className="stroke-primary" /> Create and configure your first workspace
            </div>
          </li>
          <li>
            <div className="flex gap-2 items-center">
              <Github className="stroke-primary" /> Connect to GitHub for version control
            </div>
          </li>
          <li>
            <div className="flex gap-2 items-center">
              <Hammer className="stroke-primary" /> Build and Publish
            </div>
          </li>
        </ul>
      </div>

      <div className="space-y-8 mb-12">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <PlusCircle className="w-7 h-7 text-primary shrink-0" />
            <h3 className="text-2xl font-semibold text-foreground">Create Your First Workspace</h3>
          </div>

          <div className="grid md:grid-cols-[600px_1fr] gap-8 items-start">
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

        {/* <VideoPlayerFigure
          src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/create-workspace-publish/stream.m3u8"
          thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/create-workspace-publish/thumbnails.vtt"
          caption="Create Workspace, Build and Publish"
          title="Create Workspace, Build and Publish"
          className="w-[500px]"
        /> */}
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="w-7 h-7 text-primary shrink-0" />
            <span className="text-2xl font-semibold text-foreground">Connect to GitHub</span>
          </div>

          <div className="grid md:grid-cols-[600px_1fr] gap-8 items-start">
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
            <Hammer className="w-7 h-7 text-primary shrink-0" />
            <span className="text-2xl font-semibold text-foreground">Build And Publish</span>
          </div>

          <div className="grid md:grid-cols-[600px_1fr] gap-8 items-start">
            <div className="flex justify-center">
              <VideoPlayerFigure
                src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/build-and-publish/stream.m3u8"
                thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/build-and-publish/thumbnails.vtt"
                caption="How to build your project and publish to deployment targets"
                title="Build And Publish"
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-6">
                Compile your markdown workspace to static HTML and deploy to your favorite hosting platform with just a few
                clicks.
              </p>
              <div className="bg-accent/10 border border-accent/50 rounded-lg p-6 mb-4">
                <h5 className="font-semibold mb-3 text-accent-foreground">Build Strategies</h5>
                <ul className="space-y-2 text-sm text-accent-foreground/90">
                  <li>✓ Freeform - compile markdown in place with sibling CSS</li>
                  <li>✓ Template - 11ty-style compilation for complex projects</li>
                  <li>✓ Download builds as encrypted or unencrypted ZIP files</li>
                </ul>
              </div>
              <div className="bg-accent/10 border border-accent/50 rounded-lg p-6">
                <h5 className="font-semibold mb-3 text-accent-foreground">Deployment Targets</h5>
                <ul className="space-y-2 text-sm text-accent-foreground/90">
                  <li>✓ GitHub Pages</li>
                  <li>✓ Netlify</li>
                  <li>✓ Vercel</li>
                  <li>✓ Cloudflare Pages</li>
                  <li>✓ AWS S3</li>
                </ul>
              </div>
              <a
                href="#builds-and-deployment"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-4"
              >
                See detailed build and deployment workflow
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="bg-muted/30 border border-border rounded-lg p-6">
        <h4 className="font-semibold text-lg mb-4 text-foreground">Next Steps</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card rounded p-4">
            <div className="font-medium mb-1">Start Editing</div>
            <div className="text-sm text-muted-foreground">Create your first markdown file and start writing</div>
          </div>
          <div className="bg-card rounded p-4">
            <div className="font-medium mb-1">Upload Images</div>
            <div className="text-sm text-muted-foreground">Drag and drop images or paste directly</div>
          </div>
          <div className="bg-card rounded p-4">
            <div className="font-medium mb-1">Build & Deploy</div>
            <div className="text-sm text-muted-foreground">Publish your site to your favorite platform</div>
          </div>
        </div>
      </div> */}
    </Section>

    <Section title="Core Features" subtitle="Powerful editing and workflow capabilities">
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
              <MDIcon className="text-primary w-8 h-8" /> Markdown & Rich Text
            </h4>
            <ul className="space-y-2 text-muted-foreground">
              <li> CommonMark syntax support</li>
              <li> Rich text mode with toolbar</li>
              <li> Source mode with CodeMirror 6</li>
              <li> Auto-save on every edit</li>
              <li> Search and replace functionality</li>
            </ul>
          </div>
          <div>
            <DocImage src="/docs/hello-editor.svg" />
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
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h4 className="font-semibold text-lg mb-4 text-card-foreground flex items-center gap-2">
          <ListTree className="text-primary" /> Document Structure & Navigation
        </h4>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col justify-between">
            <p className="text-muted-foreground mb-4">
              Visualize document hierarchy with the tree view. Click elements to navigate, drag to reorder sections.
            </p>
            <DocImage src="/docs/markdown-tree.svg" className="w-96" />
          </div>
          <div>
            <p className="text-muted-foreground mb-4">
              Quick navigation with heading anchors and section links for easy document traversal.
            </p>
            <DocImage src="/docs/hash-headings.svg" className="h-72" />
          </div>
        </div>
      </div>
    </Section>

    <Section title="Working With Images" subtitle="Multiple upload methods with smart management">
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
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

        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Code2 className="text-primary" /> Markdown WYSIWYG & Source Editor
          </h4>
          <p className="text-muted-foreground mb-4">Rich editing experience with full source mode support</p>
          <DocImage src="/docs/md-arrow.svg" className="h-72" />
        </div>
      </div>
    </Section>

    <Section title="File and Sidebar Management" subtitle="Organized workspace with powerful file operations">
      {/* <div className="grid md:grid-cols-2 gap-8 mb-8 bg-card">
        <div>
          <h4 className="font-semibold text-lg mb-4 text-card-foreground">File Tree</h4>
          <p className="text-muted-foreground mb-4">
            Drag and drop files between directories. Rename with Enter, delete with Backspace. Full keyboard navigation
            support.
          </p>
          <DocImage src="/docs/file-tree.svg" />
        </div>

        <div>
          <h4 className="font-semibold text-lg mb-4 text-card-foreground">Trash Management</h4>
          <p className="text-muted-foreground mb-4">
            Deleted files move to Trash where they can be restored or permanently deleted. Files in Trash are excluded
            from Git.
          </p>
          <DocImage src="/docs/trash-banner.svg" />
        </div>
      </div> */}

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
              Deleted files move to Trash where they can be restored or permanently deleted. Files in Trash are excluded
              from Git.
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
    </Section>

    <Section title="Search & Navigation" subtitle="Find anything quickly across your workspace">
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
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono inline-block">Cmd/Ctrl + F</span> to
              search within your current workspace.
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

      <div className="my-4 w-[500px]">
        <VideoPlayerFigure
          caption="Searching across all files in the workspace with regex support"
          src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/search-across-workspaces/stream.m3u8"
          thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/search-across-workspaces/thumbnails.vtt"
          title="Search Across Workspaces"
        />
      </div>
    </Section>

    <Section title="Customization & Themes" subtitle="Make Opal look the way you want">
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <Palette className="text-primary" /> Theme Selection
        </h3>
        <p className="text-muted-foreground mb-4">
          Switch between light, dark, and system modes. Choose from multiple built-in themes via the stone menu or
          command palette.
        </p>
        <VideoPlayerFigure
          className="w-[500px]"
          src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/theme-select/stream.m3u8"
          thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/theme-select/thumbnails.vtt"
          title="Theme Select"
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h4 className="font-semibold text-lg mb-4 text-card-foreground">Available Themes</h4>
        <ImageWithViewer src="/themes.png" alt="Theme options" />
      </div>
    </Section>

    <Section title="Workspaces & Storage" subtitle="Isolated environments with flexible storage options">
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

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
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
    </Section>
    {/* <DocImage src="/docs/lock-doc.svg" className="h-72" /> */}

    <Section title="Git Integration" subtitle="Practical version control without complexity">
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
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

      <div className="bg-accent/20 border border-accent rounded-lg p-6">
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
    </Section>

    <Section title="Preview Modes" subtitle="See your content before publishing">
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
          <div className="text-muted-foreground text-sm">Opens external preview window for dual-monitor workflows.</div>
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
        <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <Paintbrush className="text-primary" />
          CSS Document Styling
        </h3>
        <p className="text-muted-foreground mb-4">
          See live previews of your CSS styling and background patterns as you edit.
        </p>
        <VideoPlayer
          src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/preview-css-background/stream.m3u8"
          thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/preview-css-background/thumbnails.vtt"
          title="Preview CSS Background"
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
          <FileCode className="text-primary" />
          Global Styles
        </h4>
        <p className="text-muted-foreground mb-4">
          Create a <code className="bg-muted px-1.5 py-0.5 rounded">global.css</code> file in your root directory to
          style all markdown documents in Freeform mode.
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li> Built-in themes: Pico CSS and GitHub CSS</li>
          <li> Sibling CSS files for local overrides</li>
          <li> Different rules for template vs. Freeform builds</li>
        </ul>
      </div>

      {/* <div className="bg-card border border-border rounded-lg p-6">
        <DocImage src="/docs/browser-bolt.svg" />
      </div> */}
    </Section>

    <Section title="Builds and Deployment" subtitle="From workspace to live site in four simple steps">
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

    <Section title="Keyboard and Navigation" subtitle="Efficient keyboard-first workflow">
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
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

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h4 className="font-semibold text-lg mb-4 text-card-foreground">More Shortcuts</h4>
        <p className="text-muted-foreground mb-4">
          Click the <strong>Shortcuts</strong> button in the workspace button bar to view the complete list of keyboard
          shortcuts and commands available in Opal.
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

      <div className="bg-accent/20 border border-accent rounded-lg p-6">
        <h4 className="font-semibold text-lg mb-3 text-accent-foreground flex items-center gap-2">
          <Command className="w-5 h-5 text-primary" />
          Command Palette
        </h4>
        <p className="text-accent-foreground/90 mb-4 text-sm">
          Press{" "}
          <span className="bg-accent/30 px-1.5 py-0.5 rounded text-xs font-mono inline-block">
            <kbd>Cmd/Ctrl + P</kbd>
          </span>{" "}
          to open Spotlight. Then you may search for files by name <b>OR</b> type{" "}
          <span className="bg-accent/30 px-1.5 py-0.5 rounded text-xs font-mono">&gt;</span> to access these commands:
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
    </Section>

    <Section title="Self-Hosting and Distribution" subtitle="Deploy Opal anywhere you want">
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Server className="text-primary" />
            Static Hosting
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Run npm run build and serve files in dist with any static file server. No special requirements needed.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li> Host on Vercel, Cloudflare Pages, Netlify</li>
            <li> Or use your own domain</li>
            <li> No server-side setup required</li>
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
            <li> Default Cloudflare proxy included</li>
            <li> Add your domain to whitelist</li>
            <li> Simple configuration provided</li>
          </ul>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Sparkle className="text-primary" /> Future-Proof Design
        </h4>
        <p>
          Zip up Opal dist with project files for use years later. Browser backward compatibility and no vendor lock-in
          ensure your content remains accessible.
        </p>
      </div>
    </Section>

    <Section title="What Makes Opal Different" subtitle="Features that set Opal apart">
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Image className="text-primary" />
            Complete Image Pipeline
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            From upload to publish, Opal handles images intelligently at every step.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Automatic WebP conversion for optimal file size
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Smart reference tracking updates markdown when images are renamed
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Service worker caching for instant load times
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Drag and drop, paste, or upload from sidebar
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Resize in editor with automatic HTML tag conversion
            </li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Wifi className="text-primary" />
            Offline & Local-First
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Browser-native architecture means speed, privacy, and complete control.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              No sign-ups or accounts required
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              All data stored locally in your browser
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Works completely offline after initial load
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Service worker caching for instant performance
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              You own your data, no vendor lock-in
            </li>
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Search className="text-primary" />
            Cross-Workspace Search
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Search across all your workspaces and documents without blocking the UI.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Search multiple workspaces simultaneously
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Powered by service worker for off-main-thread performance
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Regex support for advanced queries
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Search markdown source including markup
            </li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Hammer className="text-primary" />
            Full Build System
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Transform markdown to production-ready HTML with layouts and templating.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Freeform builds for simple sites
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              11ty-style template compilation for complex projects
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              CSS inlining and global styles
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Build versioning and rollback support
            </li>
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <GitBranch className="text-primary" />
            Git Protocol Support
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Real Git integration that speaks the Git protocol directly in the browser.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              GitHub fully tested and supported
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Potentially works with other Git servers via CORS proxy
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Push, pull, sync, branch, merge, and commit
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Conflict resolution built into source editor
            </li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold text-lg mb-3 text-card-foreground flex items-center gap-2">
            <Keyboard className="text-primary" />
            Keyboard-First Design
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Built on shadcn/radix with keyboard navigation as a priority.
          </p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Full keyboard navigation throughout the app
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Accessible components from shadcn/radix
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Spotlight command palette for quick actions
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              Robust error handling and user feedback
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-6 mt-8">
        <h4 className="font-semibold text-lg mb-3 text-foreground flex items-center gap-2">
          <Zap className="text-primary" />
          Optimized for Speed
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
    </Section>

    <Section title="Service Workers" subtitle="Central to Opal's performance and offline capabilities">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-lg mb-3 text-card-foreground">Core Functionality</h4>
            <ul className="space-y-2 text-muted-foreground">
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
            <h4 className="font-semibold text-lg mb-3 text-card-foreground">Performance Benefits</h4>
            <ul className="space-y-2 text-muted-foreground">
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
    </Section>
  </>
);
