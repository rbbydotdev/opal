# Build Strategies

This document outlines the build strategies for compiling workspaces into static websites.

## Common Features

All build strategies share these common features:

### CSS Integration
- `global.css` is included in all generated pages
- Additional CSS files can be specified in front matter `styles` array
- CSS files are copied to output without compilation

### Markdown Front Matter
- `layout`: Specifies which template file to use (required)
- `styles`: Array of CSS files to include (optional)
- `scripts`: Array of JS files to include (optional, may be commented out initially)
- `title`: Page title (optional)
- `summary`: Page summary for blog strategy (optional)

### File Processing
- Templates (.mustache) are compiled to HTML
- Markdown (.md) files are converted to HTML using specified layout
- Images and other assets are copied unchanged
- Directories prefixed with `_` are not included in output (used for templates/internal files)

### Error Handling
- Missing layout templates emit build errors
- Build process displays in modal with terminal-like logging
- Step-by-step progress indication

## Build Strategies

### 1. Freeform Strategy

**Goal**: Direct static site generation with 1:1 file mapping.

**Process**:
- Convert templates: `index.mustache` → `index.html`
- Convert markdown: `/a/b/c/mypage.md` → `/a/b/c/mypage.html`
- Copy CSS, images, and other assets unchanged
- Ignore directories starting with `_`
- Apply specified layout template to markdown files
- Include global.css and any additional styles from front matter

### 2. Book Strategy

**Goal**: Single continuous HTML page for PDF printing.

**Process**:
- Create one large HTML file from all content in `_pages/` directory
- Sort pages by filename prefix (e.g., `1_introduction.md`, `2_chapter1.md`)
- Generate table of contents from page titles in front matter
- Use root page layout template
- Concatenate all page content with page breaks between sections
- Include global.css and page-specific styles
- Suitable for PDF generation with proper page breaks

**Template Requirements**:
- Root layout template handles overall page structure
- Page break CSS between content sections
- Table of contents generation using titles from front matter
- Navigation/table of contents generation

### 3. Blog Strategy

**Goal**: Blog-style website with index and individual posts.

**Process**:
- Generate blog roll index page listing all posts
- Read posts from `/posts/` directory
- Sort posts by creation date (from front matter or file stats)
- Extract title and summary from post front matter for blog roll
- Generate individual post pages using specified layouts
- Optional pagination for blog roll (may require JavaScript)

**Structure**:
- Index page: Blog roll with post summaries
- `/posts/`: Individual blog post pages
- Posts sorted chronologically (newest first)

## Implementation Notes

### Builder Class Structure
- Takes source and output disk parameters
- Modular design for easy strategy extension
- Helper functions for common operations:
  - File copying
  - Template rendering
  - Markdown processing
  - Front matter parsing
  - Directory traversal

### Extensibility
- Imperative execution model for easy step addition
- Strategy-specific build step registration
- Common helper functions shared across strategies
- Plugin-like architecture for custom build steps

### Logging
- Terminal-style build output
- Step-by-step progress indication
- Error reporting with file locations
- Build time tracking