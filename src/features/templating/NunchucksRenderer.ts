import { AbsPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import nunjucks from "nunjucks";
import { BaseRenderer, HelperCore } from "./BaseRenderer";

export interface NunchucksTemplateData {
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
  helpers?: NunchucksTemplateHelpers;
  [key: string]: any;
}

interface NunchucksTemplateHelpers {
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

export class NunchucksRenderer extends BaseRenderer {
  private nunjucksEnv: nunjucks.Environment;

  constructor(workspace: Workspace) {
    super(workspace);

    // Create a simple environment without file system loader
    this.nunjucksEnv = new nunjucks.Environment(null, {
      autoescape: false, // Allow HTML output
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
    });

    // Add helper functions as global filters
    this.setupFilters();
  }

  protected getRendererName(): string {
    return "Nunchucks";
  }

  /**
   * Renders a template string with the provided data
   */
  renderString(templateContent: string, data: NunchucksTemplateData = {}): string {
    try {
      const enrichedData = this.enrichTemplateData(data);
      return this.nunjucksEnv.renderString(templateContent, enrichedData) || "";
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Renders a template file from the workspace
   */
  async renderTemplate(templatePath: AbsPath, data: NunchucksTemplateData = {}): Promise<string> {
    try {
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);

      // Check if template has includes/extends
      if (this.hasIncludes(content)) {
        return await this.renderWithIncludes(content, data);
      }

      return this.renderString(content, data);
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Renders template with includes/extends support
   */
  private async renderWithIncludes(templateContent: string, data: NunchucksTemplateData = {}): Promise<string> {
    try {
      const enrichedData = this.enrichTemplateData(data);

      // Create a custom environment for this render with async file loading
      const customEnv = new nunjucks.Environment(null, {
        autoescape: false,
        throwOnUndefined: false,
        trimBlocks: true,
        lstripBlocks: true,
      });

      // Override addExtension to support async file loading
      const originalAddExtension = customEnv.addExtension.bind(customEnv);
      customEnv.addExtension = (name: string, extension: any) => {
        if (name === 'IncludeExtension') {
          // Custom include extension that reads from workspace
          extension.tags = ['include'];
          extension.parse = (parser: any, nodes: any) => {
            const tok = parser.nextToken();
            const args = parser.parseSignature(null, true);
            parser.advanceAfterBlockEnd(tok.value);

            // Custom node that handles workspace file reading
            return new nodes.CallExtension(this, 'renderInclude', args);
          };
        }
        return originalAddExtension(name, extension);
      };

      this.setupFiltersForEnv(customEnv);

      return new Promise((resolve, reject) => {
        customEnv.renderString(templateContent, enrichedData, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result || "");
          }
        });
      });
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Check if template contains includes or extends
   */
  private hasIncludes(templateContent: string): boolean {
    return /\{\%\s*(include|extends|import)\s/.test(templateContent);
  }

  /**
   * Enriches template data with workspace-specific information
   */
  private enrichTemplateData(data: NunchucksTemplateData): NunchucksTemplateData {
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
   * Gets template helper functions for Nunchucks
   */
  private getTemplateHelpers(): NunchucksTemplateHelpers {
    return {
      // Use shared core functions directly
      ...HelperCore,
    };
  }

  /**
   * Set up Nunjucks filters using shared helper core
   */
  private setupFilters(): void {
    this.setupFiltersForEnv(this.nunjucksEnv);
  }

  /**
   * Set up filters for a given Nunjucks environment
   */
  private setupFiltersForEnv(env: nunjucks.Environment): void {
    // String filters
    env.addFilter('capitalize', HelperCore.capitalize);
    env.addFilter('lowercase', HelperCore.lowercase);
    env.addFilter('uppercase', HelperCore.uppercase);
    env.addFilter('truncate', HelperCore.truncate);
    env.addFilter('slugify', HelperCore.slugify);

    // Array filters
    env.addFilter('first', HelperCore.first);
    env.addFilter('last', HelperCore.last);
    env.addFilter('take', HelperCore.take);
    env.addFilter('skip', HelperCore.skip);

    // Date filters
    env.addFilter('formatDate', HelperCore.formatDate);

    // File filters
    env.addFilter('getFileExtension', HelperCore.getFileExtension);
    env.addFilter('getFileName', HelperCore.getFileName);
    env.addFilter('getFileSize', HelperCore.getFileSize);

    // Image filters
    env.addFilter('filterImages', HelperCore.filterImages);
    env.addFilter('getImagesByType', HelperCore.getImagesByType);

    // Utility filters
    env.addFilter('json', HelperCore.json);
    env.addFilter('escape', HelperCore.escape);
    env.addFilter('length', HelperCore.length);
    env.addFilter('equals', HelperCore.equals);

    // Global functions
    env.addGlobal('now', HelperCore.now);
  }

  /**
   * Updates the workspace reference
   */
  updateWorkspace(workspace: Workspace): void {
    super.updateWorkspace(workspace);
    // Recreate environment with new workspace reference
    this.nunjucksEnv = new nunjucks.Environment(null, {
      autoescape: false,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true,
    });
    this.setupFilters();
  }
}