import { Workspace } from "@/data/Workspace";
import { AbsPath } from "@/lib/paths2";
import Mustache from "mustache";
import { BaseRenderer, HelperCore, createMustacheLambda } from "./BaseRenderer";

export interface MustacheTemplateData {
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
  helpers?: MustacheTemplateHelpers;
  [key: string]: any;
}

export interface MustacheTemplateHelpers {
  // String helpers
  capitalize: () => (text: string, render: (template: string) => string) => string;
  lowercase: () => (text: string, render: (template: string) => string) => string;
  uppercase: () => (text: string, render: (template: string) => string) => string;
  truncate: (length: number, suffix?: string) => (text: string, render: (template: string) => string) => string;
  slugify: () => (text: string, render: (template: string) => string) => string;

  // Array helpers
  first: () => (arr: any[], render: (template: string) => string) => any;
  last: () => (arr: any[], render: (template: string) => string) => any;
  take: (count: number) => (arr: any[], render: (template: string) => string) => any[];
  skip: (count: number) => (arr: any[], render: (template: string) => string) => any[];

  // Date helpers
  formatDate: (format?: string) => (date: Date | string, render: (template: string) => string) => string;
  now: () => string;

  // File helpers
  getFileExtension: () => (path: string, render: (template: string) => string) => string;
  getFileName: () => (path: string, render: (template: string) => string) => string;
  getFileSize: () => (bytes: number, render: (template: string) => string) => string;

  // Image helpers
  filterImages: () => (files: any[], render: (template: string) => string) => any[];
  getImagesByType: (type: string) => (images: any[], render: (template: string) => string) => any[];

  // Utility helpers
  json: () => (obj: any, render: (template: string) => string) => string;
  escape: () => (str: string, render: (template: string) => string) => string;
  length: () => (arr: any[] | string, render: (template: string) => string) => number;
  equals: (b: any) => (a: any, render: (template: string) => string) => boolean;
}

export class MustacheRenderer extends BaseRenderer {
  // private templateCache: Map<string, string> = new Map();

  constructor(workspace: Workspace) {
    super(workspace);
  }

  protected getRendererName(): string {
    return "Mustache";
  }

  /**
   * Renders a template string with the provided data
   */
  renderString(templateContent: string, data: MustacheTemplateData = {}): string {
    try {
      const enrichedData = this.enrichTemplateData(data);
      return Mustache.render(templateContent, enrichedData) || "";
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Renders a template file from the workspace
   */
  async renderTemplate(templatePath: AbsPath, data: MustacheTemplateData = {}): Promise<string> {
    try {
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);
      return this.renderString(content, data);
    } catch (error) {
      return this.formatError(error);
    }
  }

  /**
   * Enriches template data with workspace-specific information
   */
  private enrichTemplateData(data: MustacheTemplateData): MustacheTemplateData {
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
   * Gets template helper functions for Mustache using DRY approach
   */
  private getTemplateHelpers(): MustacheTemplateHelpers {
    const {
      stringHelper,
      stringHelperWithParams,
      arrayHelper,
      arrayHelperWithParams,
      dateHelper,
      simpleHelper,
      simpleHelperWithParams,
    } = createMustacheLambda;

    return {
      // String helpers (use shared core functions with lambda wrappers)
      capitalize: stringHelper(HelperCore.capitalize),
      lowercase: stringHelper(HelperCore.lowercase),
      uppercase: stringHelper(HelperCore.uppercase),
      truncate: stringHelperWithParams(HelperCore.truncate),
      slugify: stringHelper(HelperCore.slugify),

      // Array helpers
      first: arrayHelper(HelperCore.first),
      last: arrayHelper(HelperCore.last),
      take: arrayHelperWithParams(HelperCore.take),
      skip: arrayHelperWithParams(HelperCore.skip),

      // Date helpers
      formatDate: dateHelper(HelperCore.formatDate),
      now: () => HelperCore.now(),

      // File helpers
      getFileExtension: stringHelper(HelperCore.getFileExtension),
      getFileName: stringHelper(HelperCore.getFileName),
      getFileSize: simpleHelper(HelperCore.getFileSize),

      // Image helpers
      filterImages: simpleHelper(HelperCore.filterImages),
      getImagesByType: simpleHelperWithParams(HelperCore.getImagesByType),

      // Utility helpers
      json: simpleHelper(HelperCore.json),
      escape: stringHelper(HelperCore.escape),
      length: simpleHelper(HelperCore.length),
      equals: simpleHelperWithParams(HelperCore.equals),
    };
  }
}
