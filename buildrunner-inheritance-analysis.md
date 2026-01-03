# BuildRunner Inheritance Analysis

## Overview
Analysis of which BuildRunner methods would need to be **overridden** vs which could be **reused** if creating EleventyBuildRunner as a subclass instead of a standalone class.

## Methods Analysis

### ✅ **REUSABLE** - No Override Needed

These methods from BuildRunner work perfectly for Eleventy and should be inherited as-is:

#### **Core Infrastructure**
- `cancel()` - Abort controller management is identical
- `constructor()` - Base setup with workspace and template manager
- **All getter properties**:
  - `sourceDisk`, `outputDisk`, `outputPath`, `sourcePath`
  - `strategy`, `fileTree`, `buildId`

#### **File Utilities**
- `isTemplateFile(node)` - Template detection works for Eleventy
- `isMarkdownFile(node)` - Markdown detection is the same
- `copyFileToOutput(node)` - File copying logic is identical
- `loadTemplate(templatePath)` - Template loading is reusable
- `processTemplate(node)` - Template processing with TemplateManager
- `processMarkdown(node)` - Markdown with front matter processing

#### **Helper Methods**
- `getGlobalCssPath()` - CSS detection logic is compatible
- `getAdditionalStylePaths()` - Style file handling is the same
- `getOutputPathForTemplate()` - Path transformation logic works
- `getOutputPathForMarkdown()` - Markdown to HTML path conversion
- `ensureDirectoryExists()` - Directory creation utility
- `writeFile()` - File writing wrapper
- `sortPagesByPrefix()` - Page ordering by numeric prefix
- `sortPostsByDate()` - Post sorting by date field

#### **Static Methods**
- `Show()`, `Recall()` - These would work with proper typing updates

### ❌ **MUST OVERRIDE** - Core Behavior Changes

These methods implement BuildRunner-specific logic that conflicts with Eleventy's conventions:

#### **Build Process**
- **`createBuildGraph()`** - **COMPLETE OVERRIDE REQUIRED**
  - BuildRunner: `freeform | book | blog` strategies
  - Eleventy: `data cascade → template processing → layout application`
  - Different node dependencies and flow entirely

- **`run()`** - **MINOR OVERRIDE**
  - Core run loop is the same
  - Just needs to call `createBuildGraph()` with Eleventy version
  - All error handling, status updates, file counting can be inherited

#### **Asset Handling**

NOTE: could use the same method, but the class must define rules as lists or functions
- **`copyAssets()`** - **LOGIC OVERRIDE**
  - BuildRunner: Copies everything except templates/markdown/underscore dirs
  - Eleventy: More nuanced handling of `_data/`, `_includes/`, data files
  - Different filter logic needed

NOTE: same as copy assets
- **`shouldCopyAsset(node)`** - **LOGIC OVERRIDE**

  - BuildRunner: Skip `_*` dirs and template files
  - Eleventy: Skip `_data/`, `_includes/`, but allow other files, handle JSON data files differently

NOTE: same as above
- **`shouldIgnoreFile(node)`** - **COULD REUSE**
  - Current logic (skip `_*` files) actually works for Eleventy processing

#### **Strategy-Specific Processing**
NOTE:likely unavoidable
- **`processTemplatesAndMarkdown()`** - **COMPLETE OVERRIDE**
  - BuildRunner: Simple 1:1 file processing
  - Eleventy: Data cascade, layout inheritance, computed data
  - Fundamentally different approach

- **`ensureOutputDirectory()`** - **PATH OVERRIDE**
  - BuildRunner: Uses fixed output path
  - Eleventy: Uses configurable `config.dir.output`
  - Logic is same, just different path calculation

### 🔄 **STRATEGIC OVERRIDE** - Eleventy-Specific Features

These methods don't exist in BuildRunner but are core to Eleventy:

#### **Data Cascade (New Methods)**
- `loadGlobalData()` - Load from `_data/` directory
- `loadDirectoryData()` - Load template and directory data files
- `buildDataCascade()` - Merge global → directory → template → front matter

#### **Template System (New Methods)**
- `renderTemplate()` - Template engine abstraction
- `applyLayout()` - Layout inheritance and chaining
- `getUrl()`, `getOutputPath()` - Permalink and URL generation

#### **Eleventy Conventions (New Methods)**
- `shouldProcessFile()` - Eleventy file processing rules
- `processFile()` - Single file with full data cascade
- `processAllTemplates()` - Batch processing with data context
- `copyStaticFiles()` - Eleventy-aware asset copying

## Inheritance Strategy Recommendations

### ✅ **Best Approach: Extend BuildRunner**

```typescript
export class EleventyBuildRunner extends BuildRunner {
  private config: EleventyConfig;

  // Override only these core methods:
  protected createBuildGraph(): DataflowGraph<EleventyBuildContext>
  private async copyAssets(): Promise<void>
  private shouldCopyAsset(node: TreeNode): boolean
  private async processTemplatesAndMarkdown(): Promise<void>
  private async ensureOutputDirectory(): Promise<void>

  // Add new Eleventy-specific methods:
  private async loadGlobalData(): Promise<Record<string, any>>
  private async loadDirectoryData(): Promise<Map<string, any>>
  private buildDataCascade(): Record<string, any>
  private async applyLayout(pageData: EleventyPageData): Promise<string>
  // ... other new methods

  // Inherit everything else unchanged:
  // - run(), cancel(), constructor()
  // - All getters, file utilities, helper methods
  // - Template and markdown processing
  // - File I/O operations
}
```

### **Override Summary**
- **5 core methods** need overriding (20% of functionality)
- **15+ methods** can be inherited as-is (80% reuse)
- **8+ new methods** needed for Eleventy features

### **Benefits of Inheritance**
1. **80% code reuse** - All file I/O, utilities, template processing
2. **Consistent API** - Same static methods, getters, lifecycle
3. **Shared debugging** - Same logging, error handling, status management
4. **Type safety** - Inherits all BuildRunner interfaces and contracts

### **Tradeoffs**
1. **Coupling** - Tied to BuildRunner's internal implementation
2. **Override complexity** - Need to carefully override private methods
3. **Strategy conflicts** - BuildRunner assumes `freeform|book|blog` strategies

## Conclusion

**Inheritance is the better approach** for EleventyBuildRunner because:

- **High reuse ratio** (80% inherited vs 20% overridden)
- **All low-level utilities** (file I/O, template processing, markdown) work identically
- **Core infrastructure** (observability, error handling, lifecycle) is identical
- **Only build orchestration** needs to change, not individual operations

The standalone approach we built is excellent for understanding the full scope, but inheritance would eliminate significant code duplication while maintaining the same functionality.