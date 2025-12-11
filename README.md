<p align="center"><img src="public/opal-circle.svg"  alt="Opal Editor" width="200"></p>

# Opal Editor

A in-browser, local-first, no-server/serverless markdown editor with images and publishing capabilities.

## Features

- **Local-first**: All your content stays on your device
- **No server required**: Works entirely in your browser
- **Markdown editing**: Clean, distraction-free writing experience
- **Image support**: Embed and manage images seamlessly
- **Publishing**: Share your work when you're ready

## Browser Compatibility

**Desktop Only** - Supported browsers:

<img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" width="24" height="24"> Chrome &nbsp;&nbsp; <img src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg" width="24" height="24"> Firefox &nbsp;&nbsp; <img src="https://upload.wikimedia.org/wikipedia/commons/9/98/Microsoft_Edge_logo_%282019%29.svg" width="24" height="24"> Edge ⚠️ &nbsp;&nbsp; <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg" width="24" height="24"> Safari ⚠️

**Required Features:**
- LocalStorage
- IndexedDB  
- Service Workers
- OPFS *(optional)*

## Get Started

Visit [opaledx.com](https://opaledx.com) to start writing.

## Development

```bash
npm install
npm run dev
```

## Build 

```bash
npm run build 
```

## Quick Start

1. Navigate to http://localhost:3000
2. Add Project
3. Select file system, (indexeddb) 
4. Enjoy!

## Credits

- The workhorse of the WYSIWIG editing is from the great work of [@petyosi](https://github.com/petyosi) - [MDX-Editor](https://github.com/mdx-editor/editor)
- Polished Stone Effect adapted from [@jhey's codepen](https://codepen.io/jh3y/pen/OPJyVGb)
- [Codemirror 6](https://codemirror.net/)
- [shadcn](https://ui.shadcn.com/)

