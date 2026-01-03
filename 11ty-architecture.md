# 11ty (Eleventy) Build Runner Architecture

## 11ty Key Features to Implement

### 1. Data Cascade
The Eleventy Data Cascade is the priority order for merging data from multiple sources. Data is merged in this order (highest priority first):
- **Front Matter Data** (in template files) - highest priority
- **Template Data Files** (like `page.json` for `page.md`)
- **Directory Data Files** (like `posts.json` for `posts/` directory)
- **Global Data Files** (in `_data/` directory) - lowest priority

### 2. Flexible Directory Conventions
Eleventy uses configurable directory conventions with these defaults:
- **Input Directory**: `.` (current directory)
- **Output Directory**: `_site`
- **Includes Directory**: `_includes` (layouts, partials, macros)
- **Data Directory**: `_data` (global data files)
- **Layouts Directory**: Can be same as includes or separate

### 3. Template Engine Support
Multiple template engines supported out of the box:
- **Liquid** (.liquid files)
- **Nunjucks** (.njk files)
- **Mustache** (.mustache files)
- **EJS** (.ejs files)
- **Markdown** (.md files) with layout support

### 4. Front Matter Support
Front matter can be in multiple formats:
- **YAML** (default): Standard YAML syntax
- **JSON**: `---json { "title": "My page title" } ---`
- **JavaScript**: Arbitrary JavaScript with exported variables

### 5. Layout System
- **Layout Inheritance**: Layouts can have their own layouts (chaining)
- **Layout Data Merging**: Layout front matter merged with template data
- **Flexible Layout Location**: Layouts stored in `_includes/` by default

### 6. Graceful Degradation
Eleventy works even when directories or files are missing:
- No `_data/` directory → no global data, but build continues
- No layout file → content rendered without layout
- Missing includes → build continues with warnings

### 7. Computed Data
The `eleventyComputed` feature allows injecting data properties based on other data values, computed right before template rendering.

### 8. Collections
Eleventy can automatically create collections from content based on tags, directory structure, or custom logic.

## Design Architecture

### BuildRunner Integration

The `EleventyBuildRunner` extends the existing `BuildRunner` class and adds Eleventy-specific functionality while maintaining compatibility with the existing build system.

#### Key Components:

1. **EleventyConfig Interface**
   ```typescript
   interface EleventyConfig {
     dir: {
       input: string;      // Default: "."
       output: string;     // Default: "_site"
       includes: string;   // Default: "_includes"
       data: string;       // Default: "_data"
       layouts?: string;   // Optional separate layouts dir
     };
   }
   ```

2. **Enhanced Build Context**
   ```typescript
   interface EleventyBuildContext {
     outputDirectoryReady?: boolean;
     sourceFilesIndexed?: boolean;
     globalDataLoaded?: boolean;
     assetsReady?: boolean;
     templatesProcessed?: boolean;
     globalData?: Record<string, any>;
     directoryData?: Map<string, any>;
     config?: EleventyConfig;
   }
   ```

3. **Extended Page Data**
   ```typescript
   interface EleventyPageData extends PageData {
     data: Record<string, any>;  // Combined data from all sources
     inputPath: string;
     outputPath: string;
     url: string;
   }
   ```

### Build Process Flow

The Eleventy build process follows this dataflow graph:

1. **Initialize** - Set up configuration
2. **Index Source Files** - Discover all source files
3. **Load Global Data** - Process `_data/` directory files
4. **Load Directory Data** - Process template and directory data files
5. **Copy Static Files** - Copy non-template assets
6. **Process Templates** - Transform templates with data cascade
7. **Apply Layouts** - Process layout inheritance
8. **Generate Output** - Write final HTML files

### Directory Structure Support

The implementation supports the standard Eleventy directory structure:

```
project/
├── _data/              # Global data files (JSON/JS)
│   ├── site.json      # Available as {{ site.* }}
│   └── nav.js         # Available as {{ nav.* }}
├── _includes/         # Layouts, partials, macros
│   ├── base.njk       # Base layout
│   └── post.njk       # Post layout
├── posts/             # Content directory
│   ├── posts.json     # Directory data (applied to all posts)
│   ├── first-post.md  # Individual post
│   └── first-post.json # Template data (for first-post.md only)
├── pages/             # Other content
│   └── about.md
├── assets/            # Static files (CSS, images, etc.)
└── _site/             # Generated output (configurable)
```

### Data Processing

#### Global Data Loading
- Scans `_data/` directory for `.json` and `.js` files
- Makes data available globally as `{{ filename.* }}`
- Gracefully handles missing `_data/` directory

#### Directory Data Loading
- Processes `directory.json` files (e.g., `posts.json` for `posts/` directory)
- Processes `template.json` files (e.g., `about.json` for `about.md`)
- Merges with global data in data cascade

#### Front Matter Processing
- Supports YAML, JSON, and JavaScript front matter
- Highest priority in data cascade
- Merged with all other data sources

### Template Processing

#### Template Engine Support
- Detects template type by file extension and MIME type
- Uses existing `TemplateManager` when available
- Falls back to Mustache for compatibility

#### Layout System
- Supports layout chaining (layouts with layouts)
- Layouts inherit data from templates
- Template data takes precedence over layout data
- Graceful fallback when layouts are missing

### URL and Permalink Generation

#### Default URL Generation
- `.md` → `.html`
- Template extensions → `.html`
- `index.html` → `/` (directory index)

#### Custom Permalinks
- Support for `permalink` front matter property
- Dynamic permalink generation with template data
- Flexible URL structure customization

### Error Handling and Graceful Degradation

The implementation follows Eleventy's philosophy of graceful degradation:
- Missing directories don't break the build
- Missing layouts result in warnings, not errors
- Invalid data files are logged but don't stop the build
- Static files are copied even if template processing fails

This approach ensures that the build system is robust and user-friendly, matching Eleventy's reputation for being flexible and forgiving.