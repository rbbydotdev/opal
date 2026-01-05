# Opal — The Local‑First Markdown Workspace

Opal is a lightweight, browser‑based markdown editor and static site builder designed for developers who care about speed, transparency, and ownership of their content.  
It’s local‑first, powered by modern browser storage and service workers — fast, offline‑friendly, and Git‑aware.

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
- Supports **CommonMark** syntax (MDX planned).  
- Two modes:  
  - **Rich text** for structured editing and quick formatting.  
  - **Source mode** (CodeMirror 6) for full control and syntax highlighting.
- Auto‑save on every keystroke.  
- **Edit history**: Every change is captured. You can browse previous edits, preview them, or restore with a click.
- **Tree view** visualizes your document structure by headings and lets you drag sections to reorder.
- Standard undo/redo: `Cmd/Ctrl + Z`, `Shift + Cmd/Ctrl + Z`.

---

## Working With Images

- Drop images from your file manager, paste them into the editor, or upload via the sidebar.  
- All images are automatically **converted to WebP** (except SVGs or when already WebP inside an OPFS mount).  
- Renaming an image triggers a best‑effort update of references across markdown files.  
- Images are cached and served through a **service worker** for instant preview and reuse.  
- In‑editor resizing converts markdown image links into HTML with explicit width/height.

---

## File & Sidebar Management

- Files and folders are fully draggable.  
- **Rename:** focus an item and press `Enter`.  
- **Delete:** `Backspace/Delete` (moves to Trash).  
- Trash files remain restorable but are ignored by Git.  
- Copy, cut, and paste work across workspaces; duplicates are automatically renamed.  
- **Sidebar:** reorder, hide, or resize sections — layout is remembered.  
- Toggle sidebar: `Cmd/Ctrl + B`.  
- Hold `Cmd/Ctrl` while toggling items in the hamburger menu to show/hide multiple sections quickly.

---

## Workspaces & Storage

- Create isolated **workspaces**, each backed by one of:
  - **IndexedDB:** fast, persistent browser storage.
  - **OPFS:** in‑browser filesystem.
  - **Mounted OPFS:** direct access to a local directory for real disk persistence.
- Mounted directories act like real folders on your machine. If renamed or moved, handles must be remounted.
- Each workspace receives a color identicon for quick recognition.
- Disk type is fixed once created for data integrity.

---

## Preview Modes

- Toggle **side preview** with `Cmd/Ctrl + |`.  
- Open **full‑window preview** or **print view** via toolbar icons.  
- Markdown always renders accurately; template views depend on your site’s structure.  
- Some browser limitations apply, so close existing print windows before opening a new one.

---

## Source Mode (CodeMirror 6)

- Clean, minimal setup tuned for markdown.  
- Automatic **conflict detection** — easily resolve merges with “ours”, “theirs”, or “both”.  
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

- **In‑document search:** via `Cmd/Ctrl + F`, works in both editor modes.  
- **Global (Opal‑wide) search:** finds text across all workspace source files.  
  - Currently searches raw markdown (including markup).  
  - Regex supported.  
  - A markup‑less search mode is being considered for future updates.

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

- **Escape ×2:** focus sidebar for keyboard control.  
- **Tab:** jump between sidebar sections.  
- **Space:** open file.  
- **Enter:** rename.  
- **Shift + Arrow:** multi‑select.  
- **Cmd/Ctrl + X / V:** cut and paste.  
- **Cmd/Ctrl + P:** open Spotlight / command bar.  
  - Type `>` to invoke commands — create files, commit, init Git, change theme, etc.

---

## Service Worker Backbone

Opal’s service worker is central to its speed:
- Handles caching of images and recently opened files.  
- Serves assets directly from browser storage, avoiding blob creation overhead.  
- Reduces network calls by acting like an RPC layer for internal requests.  
- Modern browsers automatically suspend idle workers, keeping CPU and memory use minimal.

---

## CORS & Hosting

Some APIs (GitHub, Netlify, etc.) require CORS proxies for browser‑side Git and deployment.  

- Opal ships with a **Cloudflare proxy** on the free tier — enough to start.  
- For production, set up your own via **Wrangler CLI** (simple config provided).  
- If self‑hosting Opal, add your domain to the **whitelisted referrer list**.  
- Because Opal is a static frontend, you can host it anywhere — Vercel, Cloudflare Pages, Netlify, or your own domain.

---

## Global Styles

- A root `global.css` automatically styles all markdown documents in **Freeform** mode.  
- Choose from built‑in themes like **Pico CSS** and **GitHub CSS**.  
- Each markdown file also loads its sibling CSS for local overrides.

---

## UI & Usability

- **Stone menu** (top‑left): navigate home, switch themes, toggle dev mode, or delete all data.  
- **Workspace bar:** shows all workspaces with unique icons; right‑click for rename/delete.  
  - Collapse or expand the bar to reclaim screen space.  
- **Real‑time sync:** all open browser tabs stay in sync via BroadcastChannel.  
- **Focus mode:** keep your editor clean while still tracking project state.

---

## Notes to Self

- Add a history dropdown for easier document recovery.  
- Explore markup‑less search implementation.  
- Introduce MDX support once the editor stabilizes.  
- Monitor File Change Event API progress for mounted OPFS sync.  
- Clarify “Freeform” vs “11ty” build behavior in documentation.  
- Improve CORS proxy documentation and detection flow.