import { Workspace } from "@/Db/Workspace";
import { AbsPath, isImage } from "@/lib/paths2";
import { Eta } from "eta";
import graymatter from "gray-matter";

export interface TemplateData {
  data?: Record<string, any>;
  images?: Array<{
    path: AbsPath;
    url: string;
    name: string;
  }>;
  fileTree?: Array<{
    path: AbsPath;
    name: string;
    type: string;
  }>;
  helpers?: TemplateHelpers;
  [key: string]: any;
}

export interface TemplateHelpers {
  // String helpers
  capitalize: (str: string) => string;
  lowercase: (str: string) => string;
  uppercase: (str: string) => string;
  truncate: (str: string, length: number, suffix?: string) => string;
  slugify: (str: string) => string;

  // Array helpers
  first: <T>(arr: T[]) => T | undefined;
  last: <T>(arr: T[]) => T | undefined;
  take: <T>(arr: T[], count: number) => T[];
  skip: <T>(arr: T[], count: number) => T[];

  // Date helpers
  formatDate: (date: Date | string, format?: string) => string;
  now: () => string;

  // File helpers
  getFileExtension: (path: string) => string;
  getFileName: (path: string) => string;
  getFileSize: (bytes: number) => string;

  // Image helpers
  filterImages: (files: any[]) => any[];
  getImagesByType: (images: any[], type: string) => any[];

  // Utility helpers
  json: (obj: any) => string;
  escape: (str: string) => string;
  length: (arr: any[] | string) => number;
  equals: (a: any, b: any) => boolean;

  // Markdown helpers
  importMarkdown: (path: string) => Promise<{ content: string; data: Record<string, any>; raw: string }>;
  importMarkdownSync: (path: string) => { content: string; data: Record<string, any>; raw: string };

  // Math helpers
  add: (a: number, b: number) => number;
  subtract: (a: number, b: number) => number;
  multiply: (a: number, b: number) => number;
  divide: (a: number, b: number) => number;
  round: (num: number, decimals?: number) => number;
}

export class EtaRenderer {
  private eta: Eta;
  private etaAsync: Eta;
  private workspace: Workspace;
  private templateCache: Map<string, string> = new Map();
  private markdownCache: Map<string, { content: string; data: Record<string, any>; raw: string }> = new Map();

  constructor(workspace: Workspace) {
    this.workspace = workspace;

    // Synchronous ETA instance
    this.eta = new Eta({
      cache: false, // Disable cache for live editing
      autoEscape: false, // Allow HTML output
    });

    // Asynchronous ETA instance (same config, but use renderStringAsync method)
    this.etaAsync = new Eta({
      cache: false, // Disable cache for live editing
      autoEscape: false, // Allow HTML output
    });

    // Set up custom file reader to read from workspace filesystem for both instances
    this.eta.readFile = this.readTemplateFromWorkspace.bind(this);
    this.eta.resolvePath = this.resolveTemplatePath.bind(this);
    this.etaAsync.readFile = this.readTemplateFromWorkspace.bind(this);
    this.etaAsync.resolvePath = this.resolveTemplatePath.bind(this);
  }

  /**
   * Renders a template string with the provided data
   */
  renderString(templateContent: string, data: TemplateData = {}): string {
    try {
      const enrichedData = this.enrichTemplateData(data);
      return this.eta.renderString(templateContent, enrichedData) || "";
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Renders a template string asynchronously (for templates with await)
   */
  async renderStringAsync(templateContent: string, data: TemplateData = {}): Promise<string> {
    try {
      // console.log('renderStringAsync called with template preview:', templateContent.substring(0, 200));
      const enrichedData = this.enrichTemplateData(data);
      // console.log('About to call etaAsync.renderStringAsync with data keys:', Object.keys(enrichedData));
      // Use ETA's built-in renderStringAsync which handles async compilation
      const result = (await this.etaAsync.renderStringAsync(templateContent, enrichedData)) || "";
      // console.log('renderStringAsync succeeded');
      return result;
    } catch (error) {
      // console.error('renderStringAsync failed with detailed error:', error);
      // console.error('Error message:', (error as Error).message);
      // console.error('Error stack:', (error as Error).stack);
      return this.formatError(error);
    }
  }

  /**
   * Renders a template file from the workspace
   */
  async renderTemplate(templatePath: AbsPath, data: TemplateData = {}): Promise<string> {
    try {
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);

      // Check if template contains await and use appropriate renderer
      if (content.includes("await")) {
        return await this.renderStringAsync(content, data);
      } else {
        return this.renderString(content, data);
      }
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Pre-loads templates for synchronous access during rendering
   */
  async preloadTemplates(templatePaths: AbsPath[]): Promise<void> {
    const loadPromises = templatePaths.map(async (path) => {
      try {
        const content = await this.workspace.readFile(path);
        this.templateCache.set(path, String(content));
      } catch (error) {
        console.warn(`Could not preload template: ${path}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Renders with preloaded templates, enabling includes/partials
   */
  async renderWithIncludes(templateContent: string, data: TemplateData = {}): Promise<string> {
    // Find all include statements in the template
    const includeMatches = templateContent.match(/<%~\s*include\(['"`]([^'"`]+)['"`]\s*(?:,\s*\{[^}]*\})?\s*\)\s*%>/g);

    if (includeMatches) {
      const includePaths = includeMatches
        .map((match) => {
          const pathMatch = match.match(/include\(['"`]([^'"`]+)['"`]/);
          return pathMatch?.[1] ? this.resolveTemplatePath(pathMatch[1]) : null;
        })
        .filter((path): path is string => path !== null);

      // Preload all included templates
      await this.preloadTemplates(includePaths as AbsPath[]);
    }

    // Check if template contains await and use appropriate renderer
    if (templateContent.includes("await")) {
      return await this.renderStringAsync(templateContent, data);
    } else {
      return this.renderString(templateContent, data);
    }
  }

  /**
   * Enriches template data with workspace-specific information
   */
  private enrichTemplateData(data: TemplateData): TemplateData {
    return {
      ...data,
      images: data.images || this.getWorkspaceImages(),
      fileTree: data.fileTree || this.getWorkspaceFileTree(),
      helpers: data.helpers || this.getTemplateHelpers(),
      // Add workspace-specific helpers
      workspace: {
        name: this.workspace.name,
        id: this.workspace.id,
      },
    };
  }

  /**
   * Gets template helper functions
   */
  private getTemplateHelpers(): TemplateHelpers {
    return {
      // String helpers
      capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
      lowercase: (str: string) => str.toLowerCase(),
      uppercase: (str: string) => str.toUpperCase(),
      truncate: (str: string, length: number, suffix = "...") =>
        str.length > length ? str.substring(0, length) + suffix : str,
      slugify: (str: string) =>
        str
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),

      // Array helpers
      first: <T>(arr: T[]) => arr[0],
      last: <T>(arr: T[]) => arr[arr.length - 1],
      take: <T>(arr: T[], count: number) => arr.slice(0, count),
      skip: <T>(arr: T[], count: number) => arr.slice(count),

      // Date helpers
      formatDate: (date: Date | string, format = "MM/DD/YYYY") => {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        return format
          .replace("MM", month)
          .replace("DD", day)
          .replace("YYYY", year.toString())
          .replace("HH", hours)
          .replace("mm", minutes);
      },
      now: () => new Date().toISOString(),

      // File helpers
      getFileExtension: (path: string) => {
        const lastDot = path.lastIndexOf(".");
        return lastDot > 0 ? path.substring(lastDot + 1) : "";
      },
      getFileName: (path: string) => path.split("/").pop() || "",
      getFileSize: (bytes: number) => {
        const sizes = ["Bytes", "KB", "MB", "GB"];
        if (bytes === 0) return "0 Bytes";
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
      },

      // Image helpers
      filterImages: (files: any[]) => files.filter((file) => isImage(file.path || file.name)),
      getImagesByType: (images: any[], type: string) =>
        images.filter((img) => (img.path || img.name).toLowerCase().endsWith(`.${type.toLowerCase()}`)),

      // Utility helpers
      json: (obj: any) => JSON.stringify(obj, null, 2),
      escape: (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;"),
      length: (arr: any[] | string) => arr.length,
      equals: (a: any, b: any) => a === b,

      // Math helpers
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => (b !== 0 ? a / b : 0),
      round: (num: number, decimals = 0) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),

      // Markdown helpers
      importMarkdown: (path: string) => {
        // For async templates, this will work directly
        return this.importMarkdownFile(path);
      },
      importMarkdownSync: (path: string) => {
        return this.importMarkdownFileSync(path);
      },
    };
  }

  /**
   * Gets all images from the workspace
   */
  private getWorkspaceImages() {
    const imagePaths = this.workspace.getImages();
    return imagePaths.map((path) => ({
      path,
      url: path, // Use direct path since service worker handles routing
      name: path.split("/").pop() || "",
    }));
  }

  /**
   * Gets the workspace file tree
   */
  private getWorkspaceFileTree() {
    const allNodes = this.workspace.getFileTree().all();
    return allNodes.map((node) => ({
      path: node.path,
      name: node.basename,
      type: node.type,
    }));
  }

  /**
   * Custom file reader for Eta to read templates from workspace
   */
  private readTemplateFromWorkspace(path: string): string {
    try {
      // Check if template is in cache first
      if (this.templateCache.has(path)) {
        return this.templateCache.get(path)!;
      }

      // If not in cache, throw error since sync reading is not available
      throw new Error(`Template not preloaded: ${path}. Use renderWithIncludes() for templates with includes.`);
    } catch (error) {
      throw new Error(`Could not read template: ${path}. ${error}`);
    }
  }

  /**
   * Custom path resolver for Eta to resolve template paths within workspace
   */
  private resolveTemplatePath(template: string): string {
    // Handle relative paths
    if (template.startsWith("./") || template.startsWith("../")) {
      // For now, resolve relative to root
      const resolvedPath = template.replace(/^\.\//, "/");
      return resolvedPath as AbsPath;
    }

    // Handle absolute paths
    if (template.startsWith("/")) {
      return template as AbsPath;
    }

    // Default to adding .eta extension if no extension provided
    const hasExtension = template.includes(".");
    return (hasExtension ? template : `${template}.eta`) as AbsPath;
  }

  /**
   * Formats errors for display in the template
   */
  formatError(error: unknown): string {
    const err = error as Error;
    const message = err.message || String(err);
    const stack = err.stack || "";

    // Log the error to console for debugging
    console.error("Template Render Error:", {
      message,
      stack,
      error: err,
    });

    return `<div class="text-red-600 p-4 border border-red-300 rounded">
      <div><strong>Template Render Error:</strong> ${message}</div>
      ${stack ? `<pre class="mt-2 whitespace-pre-wrap text-sm">${stack}</pre>` : ""}
    </div>`;
  }

  /**
   * Imports a markdown file and parses its frontmatter and content
   */
  private async importMarkdownFile(path: string): Promise<{ content: string; data: Record<string, any>; raw: string }> {
    try {
      // Resolve the path relative to workspace
      const resolvedPath = this.resolveMarkdownPath(path);

      // Check cache first
      if (this.markdownCache.has(resolvedPath)) {
        return this.markdownCache.get(resolvedPath)!;
      }

      // Read the markdown file from workspace
      const markdownContent = await this.workspace.readFile(resolvedPath);
      const rawContent = String(markdownContent);

      // Parse with gray-matter
      const parsed = graymatter(rawContent);

      const result = {
        content: parsed.content, // markdown content without frontmatter
        data: parsed.data, // frontmatter data
        raw: rawContent, // original file content
      };

      // Cache the result
      this.markdownCache.set(resolvedPath, result);

      return result;
    } catch (error) {
      throw new Error(`Could not import markdown file: ${path}. ${error}`);
    }
  }

  /**
   * Synchronous version for templates that have preloaded markdown files
   */
  private importMarkdownFileSync(path: string): { content: string; data: Record<string, any>; raw: string } {
    try {
      const resolvedPath = this.resolveMarkdownPath(path);

      // Check if markdown is in cache
      if (this.markdownCache.has(resolvedPath)) {
        return this.markdownCache.get(resolvedPath)!;
      }

      // If not in cache, throw error since sync reading is not available
      throw new Error(`Markdown not preloaded: ${path}. Use renderWithMarkdown() for templates with markdown imports.`);
    } catch (error) {
      throw new Error(`Could not import markdown file: ${path}. ${error}`);
    }
  }

  /**
   * Resolves markdown file paths within the workspace
   */
  private resolveMarkdownPath(path: string): AbsPath {
    // Handle relative paths
    if (path.startsWith("./") || path.startsWith("../")) {
      // For now, resolve relative to root
      const resolvedPath = path.replace(/^\.\//, "/");
      return resolvedPath as AbsPath;
    }

    // Handle absolute paths
    if (path.startsWith("/")) {
      return path as AbsPath;
    }

    // Default to adding .md extension if no extension provided
    const hasExtension = path.includes(".");
    return (hasExtension ? `/${path}` : `/${path}.md`) as AbsPath;
  }

  /**
   * Pre-loads markdown files for synchronous access during rendering
   */
  async preloadMarkdownFiles(markdownPaths: string[]): Promise<void> {
    const loadPromises = markdownPaths.map(async (path) => {
      try {
        await this.importMarkdownFile(path);
      } catch (error) {
        console.warn(`Could not preload markdown: ${path}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Renders with preloaded markdown files, enabling markdown imports
   */
  async renderWithMarkdown(
    templateContent: string,
    data: TemplateData = {},
    markdownPaths: string[] = []
  ): Promise<string> {
    // Auto-detect markdown import statements in the template
    const markdownMatches = templateContent.match(/<%.*?helpers\.importMarkdown\(['"`]([^'"`]+)['"`]\)/g);

    if (markdownMatches) {
      const detectedPaths = markdownMatches
        .map((match) => {
          const pathMatch = match.match(/importMarkdown\(['"`]([^'"`]+)['"`]\)/);
          return pathMatch ? pathMatch[1] : null;
        })
        .filter((path): path is string => path !== null && path !== undefined);

      // Merge with explicitly provided paths
      const allPaths = [...new Set([...markdownPaths, ...detectedPaths])];

      // Preload all markdown files
      await this.preloadMarkdownFiles(allPaths);
    }

    // Check if template contains await and use appropriate renderer
    const hasAwait = templateContent.includes("await");
    // console.log("renderWithMarkdown - hasAwait:", hasAwait, "template preview:", templateContent.substring(0, 200));

    if (hasAwait) {
      // console.log("Using async renderer for template with await");
      return await this.renderStringAsync(templateContent, data);
    } else {
      // console.log("Using sync renderer for template without await");
      return this.renderString(templateContent, data);
    }
  }

  /**
   * Updates the workspace reference (useful for workspace changes)
   */
  updateWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
    // Clear caches when workspace changes
    this.markdownCache.clear();
  }
}
