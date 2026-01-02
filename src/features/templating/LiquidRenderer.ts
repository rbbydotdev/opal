import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { Liquid } from "liquidjs";
import { BaseRenderer, HelperCore } from "./BaseRenderer";

export interface LiquidTemplateData {
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
  helpers?: LiquidTemplateHelpers;
  [key: string]: any;
}

interface LiquidTemplateHelpers {
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
}

export class LiquidRenderer extends BaseRenderer {
  private liquidEngine: Liquid;

  constructor(workspace: Workspace) {
    super(workspace);

    this.liquidEngine = new Liquid({
      // Configure for workspace file loading
      fs: {
        readFileSync: (path: string) => {
          throw new Error(`Sync file reading not supported: ${path}`);
        },
        readFile: async (path: string) => {
          try {
            const resolvedPath = this.resolvePath(path);
            const content = await this.workspace.readFile(resolvedPath);
            return String(content);
          } catch (error) {
            throw new Error(`Could not read template: ${path}. ${error}`);
          }
        },
        existsSync: () => true, // Assume files exist, let readFile handle errors
        exists: async () => true,
        resolve: (root: string, file: string) => this.resolvePath(file),
      },
      extname: '.liquid', // Default extension for includes
      dynamicPartials: true,
      strictFilters: false,
      strictVariables: false,
    });

    this.setupFilters();
  }

  protected getRendererName(): string {
    return "Liquid";
  }

  /**
   * Renders a template string with the provided data
   */
  renderString(templateContent: string, data: LiquidTemplateData = {}): string {
    try {
      const enrichedData = this.enrichTemplateData(data);
      // Note: Liquid is inherently async, but we provide a sync interface
      // This will work for templates without includes/extends
      const engine = new Liquid({ strictFilters: false, strictVariables: false });
      this.setupFiltersForEngine(engine);

      // Use parseAndRenderSync for simple templates
      return engine.parseAndRenderSync(templateContent, enrichedData) || "";
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Renders a template file from the workspace
   */
  async renderTemplate(templatePath: AbsPath, data: LiquidTemplateData = {}): Promise<string> {
    try {
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);

      // Use async rendering to support includes/extends
      const enrichedData = this.enrichTemplateData(data);
      const result = await this.liquidEngine.parseAndRender(content, enrichedData);
      return result || "";
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Resolve template paths within the workspace
   */
  private resolvePath(template: string): AbsPath {
    // Handle relative paths
    if (template.startsWith("./") || template.startsWith("../")) {
      const resolvedPath = template.replace(/^\.\//, "/");
      return resolvedPath as AbsPath;
    }

    // Handle absolute paths
    if (template.startsWith("/")) {
      return template as AbsPath;
    }

    // Default to adding .liquid extension if no extension provided
    const hasExtension = template.includes(".");
    return (hasExtension ? `/${template}` : `/${template}.liquid`) as AbsPath;
  }

  /**
   * Enriches template data with workspace-specific information
   */
  private enrichTemplateData(data: LiquidTemplateData): LiquidTemplateData {
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
   * Gets template helper functions for Liquid
   */
  private getTemplateHelpers(): LiquidTemplateHelpers {
    return {
      // Use shared core functions directly
      ...HelperCore,
    };
  }

  /**
   * Set up Liquid filters using shared helper core
   */
  private setupFilters(): void {
    this.setupFiltersForEngine(this.liquidEngine);
  }

  /**
   * Set up filters for a given Liquid engine instance
   */
  private setupFiltersForEngine(engine: Liquid): void {
    // String filters
    engine.registerFilter('capitalize', HelperCore.capitalize);
    engine.registerFilter('lowercase', HelperCore.lowercase);
    engine.registerFilter('uppercase', HelperCore.uppercase);
    engine.registerFilter('truncate', (str: string, length: number, suffix = "...") =>
      HelperCore.truncate(str, length, suffix));
    engine.registerFilter('slugify', HelperCore.slugify);

    // Array filters
    engine.registerFilter('first', HelperCore.first);
    engine.registerFilter('last', HelperCore.last);
    engine.registerFilter('take', (arr: any[], count: number) => HelperCore.take(arr, count));
    engine.registerFilter('skip', (arr: any[], count: number) => HelperCore.skip(arr, count));

    // Date filters
    engine.registerFilter('format_date', (date: Date | string, format = "MM/DD/YYYY") =>
      HelperCore.formatDate(date, format));

    // File filters
    engine.registerFilter('file_extension', HelperCore.getFileExtension);
    engine.registerFilter('file_name', HelperCore.getFileName);
    engine.registerFilter('file_size', HelperCore.getFileSize);

    // Image filters
    engine.registerFilter('filter_images', HelperCore.filterImages);
    engine.registerFilter('images_by_type', (images: any[], type: string) =>
      HelperCore.getImagesByType(images, type));

    // Utility filters
    engine.registerFilter('json', HelperCore.json);
    engine.registerFilter('escape_html', HelperCore.escape);
    engine.registerFilter('size', HelperCore.length);
    engine.registerFilter('equals', (a: any, b: any) => HelperCore.equals(a, b));

    // Global functions/tags (if needed)
    engine.registerTag('now', {
      render: () => HelperCore.now(),
    });
  }

  /**
   * Updates the workspace reference
   */
  updateWorkspace(workspace: Workspace): void {
    super.updateWorkspace(workspace);
    // Recreate the engine with new workspace reference
    this.liquidEngine = new Liquid({
      fs: {
        readFileSync: (path: string) => {
          throw new Error(`Sync file reading not supported: ${path}`);
        },
        readFile: async (path: string) => {
          try {
            const resolvedPath = this.resolvePath(path);
            const content = await workspace.readFile(resolvedPath);
            return String(content);
          } catch (error) {
            throw new Error(`Could not read template: ${path}. ${error}`);
          }
        },
        existsSync: () => true,
        exists: async () => true,
        resolve: (root: string, file: string) => this.resolvePath(file),
      },
      extname: '.liquid',
      dynamicPartials: true,
      strictFilters: false,
      strictVariables: false,
    });
    this.setupFilters();
  }
}