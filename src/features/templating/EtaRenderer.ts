import { Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";
import { Eta } from "eta/core";
import graymatter from "gray-matter";
import { BaseRenderer, SharedHelpers } from "./BaseRenderer";

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

  // // Math helpers
  // add: (a: number, b: number) => number;
  // subtract: (a: number, b: number) => number;
  // multiply: (a: number, b: number) => number;
  // divide: (a: number, b: number) => number;
  // round: (num: number, decimals?: number) => number;
}

export class EtaRenderer extends BaseRenderer {
  private eta: Eta;
  private etaAsync: Eta;
  private templateCache: Map<string, string> = new Map();

  constructor(workspace: Workspace) {
    super(workspace);

    // Synchronous ETA instance
    this.eta = new Eta({
      cache: false, // Disable cache for live editing
      autoEscape: false, // Allow HTML output
      // debug: true,
    });

    // Asynchronous ETA instance (same config, but use renderStringAsync method)
    this.etaAsync = new Eta({
      cache: false, // Disable cache for live editing
      autoEscape: false, // Allow HTML output
      // debug: true,
    });

    // Set up custom file reader to read from workspace filesystem for both instances
    this.eta.readFile = this.readTemplateFromWorkspace.bind(this);
    this.eta.resolvePath = this.resolveTemplatePath.bind(this);
    this.etaAsync.readFile = this.readTemplateFromWorkspace.bind(this);
    this.etaAsync.resolvePath = this.resolveTemplatePath.bind(this);
  }

  protected getRendererName(): string {
    return "ETA";
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
      const enrichedData = this.enrichTemplateData(data);
      const result = (await this.etaAsync.renderStringAsync(templateContent, enrichedData)) || "";
      return result;
    } catch (error) {
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

      // Use renderWithIncludes to support template includes
      return await this.renderWithIncludes(content, data);
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
      // Use shared helpers directly
      ...SharedHelpers,

      // Markdown helpers (ETA-specific)
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
    super.updateWorkspace(workspace);
    // Clear template cache when workspace changes
    this.templateCache.clear();
  }
}
