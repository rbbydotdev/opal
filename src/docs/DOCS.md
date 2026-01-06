# Opal

Opal is a lightweight, browser‑based markdown editor and static site builder designed for developers who care about speed, transparency, and ownership of their content.
It's local‑first, powered by modern browser storage and service workers — fast, offline‑friendly, and Git‑aware.

## Key Features

### One-Click Static Site Publishing
Deploy instantly to **Netlify**, **Cloudflare Pages**, **AWS S3**, **GitHub Pages**, or **Vercel** using OAuth or API key authentication. No complex build pipelines or server configurations required.

### Runs Entirely in Your Browser
**Zero backend dependencies** — everything lives in your browser. Projects can be stored purely in browser storage (IndexedDB) or mounted to local file directories. No server required except optional CORS proxies (which you can self-host).

### Flexible File System Options
- **Browser storage**: Fast IndexedDB persistence that survives browser sessions
- **Local directory mounting**: Direct access to your file system with real disk persistence
- **Hybrid approach**: Mix and match storage types per workspace

### Offline-First Architecture
Service worker-powered caching and processing means Opal works completely offline. Edit, build, and preview without an internet connection.

### Complete Data Ownership
Your content stays yours. Self-hostable, open source, and designed to work years into the future with no vendor lock-in.

---

## Overview

Opal gives you a full editing and publishing pipeline inside your browser:
- **Edit** markdown or rich text.
- **Preview** with live updates.
- **Version & sync** via Git.
- **Build & deploy** to your favorite static hosts.

All of this happens client‑side — no servers or backend dependencies unless you choose to connect remote Git or deployment targets.

---

## Editing Experience

### Markdown & Rich Text
- Supports **CommonMark** syntax (MDX planned but avoided in v1 for simplicity).
- **Two editing modes**:
  - **Rich text mode** (MDX Editor): Structured editing with toolbar for headings, lists, dividers, paragraphs, and images. Currently MDX is disabled.
  - **Source mode** (CodeMirror 6): Full control with syntax highlighting and custom plugins.
- **Auto‑save**: Every file automatically saved on every edit - no manual saving required.
- **Multiple tabs**: Edit one file at a time, but open new browser tabs for additional files with cross-tab syncing.
- **Search capabilities**:
  - In-document search via `Cmd/Ctrl + F` in both modes.
  - Rich text mode includes find and replace.
  - **Markdown prettification** available for consistent formatting.

### Edit History & Tree View
- **Edit history**: Every change captured with debounced saving. Browse, preview, and restore previous edits with OK/Cancel confirmation.
- **Virtualized history list** for performance with large edit counts.
- **Edit previews**: Hover over edit items to see image and HTML previews (note: images may not show if moved since that edit).
- **History management**: Clear all history option with confirmation.
- **Tree view**: In rich text mode, visualize document hierarchy by headings with drag-and-drop section reordering (undo with `Cmd/Ctrl + Z` in editor).
- Standard undo/redo: `Cmd/Ctrl + Z`, `Shift + Cmd/Ctrl + Z`.

### Tree View Section (Rich Text Mode)

Hierarchical visualization of your markdown document structure. Click elements to navigate, expand sections to view nested content. Shows headings, paragraphs, lists, images, and links with visual indicators. Updates automatically as you edit.

---

## Working With Images

- **Multiple upload methods**: Drop images from your file manager, paste them into the editor, upload via the sidebar, or drag directly into the rich text editor.
- All images are automatically **converted to WebP** (except SVGs or when already WebP inside an OPFS mount).
- **Smart referencing**: Renaming an image triggers a best‑effort update of references across markdown files to maintain links.
- Images are cached and served through a **service worker** for instant preview and reuse with snappy load times.
- **In‑editor resizing** converts markdown image links into HTML with explicit width/height attributes.
- **Rich text editor integration**: Image dialog populated with all workspace images, supports titles and alt text.
- **Fast uploads**: Memory is shared, not copied, making image file uploads exceptionally fast.

---

## File & Sidebar Management

### File Operations
- Files and folders are fully draggable within and between directories.
- **Rename:** focus an item and press `Enter` to make it editable; submit with `Enter` or cancel with `Escape`/click away.
- **Delete:** `Backspace/Delete` moves files to Trash (they remain restorable but are ignored by Git).
- **Multiple file creation**: Right-click directories or use action buttons to create markdown, CSS, and template files.
- **Copy, cut, and paste** work across workspaces with automatic duplicate renaming (numerical increment).
- **Stock files**: Quick creation of example files and global CSS templates.

### Trash Management
- Deleted files move to Trash (saved under `.trash` in OPFS mounts).
- Files in Trash can be viewed, edited, and restored with a banner prompt.
- **Permanent deletion** available from Trash menu - files are gone forever.
- Trash files are excluded from version control.

### Sidebar Organization
- **Drag and drop** sections to reorder - layout is remembered between sessions.
- **Resize** sidebar by dragging the right-side divider.
- Toggle sidebar: `Cmd/Ctrl + B`.
- **Hamburger menu**: Hold `Cmd/Ctrl` while clicking to quickly toggle multiple sections without closing the menu.
- Sections include: files, treeview, upload, export, build, git, connections, and trash.

---

## Workspaces & Storage

### Workspace Creation & Management
- Create isolated **workspaces** with custom names and storage types.
- Each workspace receives a **colored multi-shape identicon** for visual recognition (name changes don't affect the icon).
- **Workspace management**: Right-click workspace names for rename/delete options.
- **Collapsible workspace bar**: Click the highlighted bar next to the stone menu to expand/contract and reclaim screen space.

### Storage Options
- **IndexedDB**: Fast, persistent browser storage (recommended for most users).
- **OPFS**: In-browser filesystem (virtually useless compared to IndexedDB, slower, but useful with OPFS file browser plugins).
- **Mounted OPFS**: Direct access to a local directory for real disk persistence - **only storage type that survives browser history clearing**.

### Storage Limitations & Considerations
- **Disk type is fixed** once created for data integrity.
- **Mounted directory handling**: If you rename or move a mounted directory, the handle becomes corrupted - you'll get an option to browse and remount the new location.
- **External file changes**: Files modified outside Opal in mounted OPFS won't immediately reflect and need a refresh (waiting for File Change Event API browser support).
- **Edit history**: Currently saved in IndexedDB regardless of workspace storage type - may be lost if file names change during remounting.
- **Cross-tab syncing**: All editing and actions sync across browser tabs using BroadcastChannel.

---

## Preview Modes

### Preview Options
- **Side preview**: Toggle with `Cmd/Ctrl + |` for split-screen editing and preview.
- **Full-window preview**: Click the window preview button on toolbar to open external preview window.
- **Print preview**: Similar button opens print dialog (alternative: open new window and press `Cmd/Ctrl + P`).

### Preview Behavior
- **Markdown rendering**: Always renders accurately with CSS styling.
- **Template preview**: Makes best effort to preview templates, partials, or files requiring site data (may not always render perfectly).
- **CSS integration**: Loads CSS for styling preview to match final output.
- **Browser limitations**: Cross-browser differences exist - close existing print windows before opening new ones due to browser limitations.

---

## Source Mode (CodeMirror 6)

- Clean, minimal setup tuned for markdown with custom plugins and enhanced editing features.
- Automatic **conflict detection** — easily resolve merges with "ours", "theirs", or "both".
- **Advanced conflict resolution** with embedded editors for side-by-side comparison.
- Toggle conflict mode off to edit raw text directly.
- Search and replace with `Cmd/Ctrl + F`.
- Prettify markdown for consistent formatting.

---

## Git Integration

Opal’s Git support aims for **practical utility over complexity**.  

- Add remote “connections” (e.g., GitHub) via the sidebar.  
- Core actions: **Pull**, **Push**, **Sync**, **Commit**, **Branch**, **Merge**, **Reset**.  
- “Main” and “Master” branches are locked from deletion.  
- Opal sometimes adds temporary “switch commits” to avoid disruptive confirmation loops; these can be undone with Reset.  
- All connections are shared across your workspaces.  
- Other Git servers are possible if you configure proper CORS and proxy rules.

---

## Search

### Document & Global Search
- **In‑document search**: Via `Cmd/Ctrl + F`, works in both editor modes.
- **Global (Opal‑wide) search**: Finds text across all workspace source files.
  - **Current limitation**: Searches raw markdown (including markup) - meaning markdown syntax must be included in search terms.
  - **Regex supported** for advanced pattern matching.
  - **Future consideration**: Markup-less search using flat 2D vectors referencing markdown tree nodes (similar to rich text search strategy).

### Spotlight Search Integration
- **Filename search**: Accessible via spotlight (`Cmd/Ctrl + P`) across all workspaces.
- **Fuzzy matching** with highlighted results and workspace grouping.
- **Command integration**: Type `>` in spotlight to access command palette.

---

## Builds & Deployment

Opal can compile and publish your projects to static sites with a single click.

### Builds
- Compiles each project into static HTML “bundles”.
- **Freeform build:** renders markdown inline with sibling and global CSS.  
- **Template mode:** follows 11ty‑style directory rules.  
- Every build is logged and stored with success/failure status for easy rollback.

### Deployments
- Built bundles can be deployed to configured **targets**.  
- Supported providers: **GitHub Pages**, **Cloudflare Pages**, **Vercel**, **Netlify**, **AWS S3**.  
- Create a **connection** (auth/credentials) first, then a **target** (repo, site, bucket, etc).  
- Deployment logs are saved and viewable per project.  
- The “View” button waits until deployment completes before opening your site.

---

## Uploads & Downloads

- Upload via drag‑drop or sidebar.  
- Supported: `SVG`, `PNG`, `JPG`, `WEBP`, `DOCX`.  
- **DOCX** files are auto‑converted to markdown; extracted images are placed in a subfolder with the document’s name.  
- **Download workspaces** as zipped archives — encrypted or not.  
  - Encryption: **AES‑256**, file names remain visible.  
  - Use a 16+ character password for strong protection.

---

## Keyboard & Navigation

- **Escape ×2:** focus sidebar (press twice to focus first item).
- **Tab:** jump between sidebar sections.
- **Space:** open file.
- **Enter:** rename.
- **Shift + Arrow:** multi‑select.
- **Cmd/Ctrl + X / V:** cut and paste.
- **Cmd/Ctrl + P:** open Spotlight / command bar.
  - Type `>` to invoke commands — create files, commit, init Git, change theme, etc.
  - **Advanced command system** with multi-step prompts, selections, and contextual filtering.
  - Cross-workspace file search with fuzzy matching and workspace grouping.
- **Keyboard shortcuts help:** accessible via the stone menu or keyboard shortcut modal.

---

## Service Worker Backbone

### Core Functionality
- **Central to performance**: Opal relies heavily on service worker for speed and efficiency.
- **Image and file caching**: Handles caching of images and recently opened files with Cache API.
- **Direct storage serving**: Serves assets directly from browser storage, avoiding blob setup/teardown overhead.
- **RPC-like communication**: Fetch API requests act as typed RPC format, especially with Hono service worker mode.

### Performance Benefits
- **Snappy image loading**: Shared memory (not copied) for fast uploads and instant recall.
- **Intelligent resource management**: Modern browsers automatically sleep/idle workers, reducing CPU and memory usage.
- **Edit preview processing**: Delegated to service worker for compiled markdown caching.
- **Network reduction**: Acts as internal request layer, reducing external network calls.
- **Debugging advantage**: Request-based architecture makes debugging straightforward as "web requests".

---

## CORS & Hosting

Some APIs (GitHub, Netlify, etc.) require CORS proxies for browser‑side Git and deployment.  

- Opal ships with a **Cloudflare proxy** on the free tier — enough to start.  
- For production, set up your own via **Wrangler CLI** (simple config provided).  
- If self‑hosting Opal, add your domain to the **whitelisted referrer list**.  
- Because Opal is a static frontend, you can host it anywhere — Vercel, Cloudflare Pages, Netlify, or your own domain.

---

## Global Styles

### CSS Hierarchy & Application
- **`global.css`** (all lowercase, root directory): Special file that styles all markdown documents in **Freeform** mode.
- **Built-in themes**: Choose from **Pico CSS** and **GitHub CSS** for subtle, attractive markdown styling.
- **Sibling CSS files**: Each markdown file automatically loads its sibling CSS for local overrides and customizations.
- **Template mode difference**: CSS rules differ for 11ty-style builds vs. Freeform builds.

---

## UI & Usability

- **Stone menu** (top‑left): navigate home, switch themes, toggle dev mode, or delete all data.
  - **Advanced context menu** with theme selection, zoom controls, sidebar toggle, and light/dark/system mode switching.
  - **Developer mode** unlocks advanced workspace management and cleanup tools.
- **Workspace bar:** shows all workspaces with unique icons; right‑click for rename/delete.
  - **Collapsible/expandable view** with drag-to-resize functionality.
  - Badge indicators for workspace errors and notification counts.
- **Real‑time sync:** all open browser tabs stay in sync via BroadcastChannel.
- **Smart notifications:** toast system for user feedback on operations and errors.
- **Focus mode:** keep your editor clean while still tracking project state.


---
## Themes & Appearance- 

- Themes can be switched via the stone menu or spotlight command palette.
- Themes are available in light dark and system modes.

### Themes

![](/themes.png)

---

## Template Imports

### GitHub Template Sharing
- **Easy template sharing**: Import templates directly from public GitHub repositories.
- **URL format**: `opaledx.com/import/gh/<owner>/<reponame>/<optional: branch>`
  - Default branch used if not specified, falling back to "main".
- **Manifest required**: Root-level manifest file: `{ version: 1, type: "template", navigate: "<file to navigate to when import finishes>" }`.
- **Import process**: Manifest fetched first, user confirms download, creates IndexedDB workspace automatically.
- **Security note**: Only accept templates you trust. HTML, markdown, and SVGs are sanitized, but exercise caution.
- **Alternative method**: Initialize a blank Git repo and pull manually, but template import is more streamlined.

---

## Self-Hosting & Distribution

### Hosting Simplicity
- **Static file hosting**: Run `npm run build` and serve files in `dist` with any static file server.
- **No special requirements**: Beyond CORS proxy configuration, no server-side setup needed.
- **Development server**: Use `npm start` for Vite's built-in static server, or `npx serve` in dist folder.
- **Universal compatibility**: Host anywhere - Vercel, Cloudflare Pages, Netlify, or your own domain.

### Long-term Compatibility
- **Future-proof design**: Zip up Opal dist with project files for use years later.
- **Browser backward compatibility**: JavaScript engines excel at running legacy code.
- **No vendor lock-in**: Entirely self-contained static application.

### CORS Proxy Setup
- **Required for production**: Deploy your own CORS proxies using included Wrangler CLI configuration.
- **Default limitations**: Included Cloudflare proxy is on free tier with usage limits.
- **Self-hosting considerations**: Add your domain to whitelisted referrer list if hosting Opal on custom domain.
- **OAuth implications**: Self-hosted instances may lose OAuth capability for GitHub/Netlify (use API key authentication instead).

---

## Advanced Features

### Performance & Optimization
- **Virtualized lists** in edit history and large file displays for smooth scrolling.
- **Service worker caching** with intelligent cache management and RPC-style communication.
- **Memory-efficient rendering** with lazy loading and optimized DOM updates.

### Developer Tools
- **Developer mode** with workspace destruction, service worker management, and cache clearing.
- **Build system diagnostics** with detailed logging and rollback capabilities.
- **Advanced Git operations** with conflict resolution, branch management, and merge strategies.

### Accessibility & User Experience
- **Keyboard navigation** throughout the application with focus management.
- **Screen reader support** with proper ARIA labels and semantic markup.
- **Responsive design** that adapts to different screen sizes and orientations.
- **Error handling** with graceful degradation and user-friendly error messages.

---

## Notes to Self

- Add a history dropdown for easier document recovery.  
- Explore markup‑less search implementation.  
- Introduce MDX support once the editor stabilizes.  
- Monitor File Change Event API progress for mounted OPFS sync.  
- Clarify “Freeform” vs “11ty” build behavior in documentation.  
- Improve CORS proxy documentation and detection flow.