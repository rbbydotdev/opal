<p align="center"><img src="public/opal-circle.svg"  alt="Opal Editor" width="200"></p>

# Opal

A local-first markdown editor and static publisher—no-server-required, Git-aware, with complete self-custody and zero backend dependencies.

## Features

- WYSIWYG & raw markdown editing with CodeMirror
- Local-first storage (IndexedDB, OPFS, or mounted filesystem)
- no-server-required with service workers
- Image support with automatic WebP conversion
- Full Git integration with GitHub support
- One-click publishing to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or S3
- Template-based static site generation
- Cross-workspace search and file navigation

## Screenshots

<p align="center">
  <img src="/public/scrn1.webp" alt="screenshot 1" width="900px">
</p>
<p align="center">
  <img src="/public/scrn2.webp" alt="screenshot 2" width="900px">
</p>

## Get Started

Visit **[opaledx.com](https://opaledx.com)** to start writing.

**[Read the full documentation](https://opaledx.com/docs)**

## Development

```bash
npm install
npm run dev
```

## Credits

- The workhorse of the WYSIWIG editing is from the great work of [@petyosi](https://github.com/petyosi) - [MDX-Editor](https://github.com/mdx-editor/editor)
- Polished Stone Effect adapted from [@jhey's codepen](https://codepen.io/jh3y/pen/OPJyVGb)
- [Codemirror 6](https://codemirror.net/)
- [shadcn](https://ui.shadcn.com/)
- Themes from [tweakcn](https://tweakcn.com/)
