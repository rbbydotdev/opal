import { Workspace } from "@/lib/events/Workspace";
import { AbsPath, isImage } from "@/lib/paths2";

export abstract class BaseRenderer {
  protected workspace: Workspace;
  protected markdownCache: Map<string, { content: string; data: Record<string, any>; raw: string }> = new Map();

  constructor(workspace: Workspace) {
    this.workspace = workspace;
  }

  /**
   * Gets all images from the workspace
   */
  protected getWorkspaceImages() {
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
  protected getWorkspaceFileTree() {
    const allNodes = this.workspace.getFileTree().all();
    return allNodes.map((node) => ({
      path: node.path,
      name: node.basename,
      type: node.type,
    }));
  }

  /**
   * Formats errors for display in the template
   */
  formatError(error: unknown): string {
    const err = error as Error;
    const message = err.message || String(err);
    const stack = err.stack || "";

    // Log the error to console for debugging
    console.error(`${this.getRendererName()} Template Render Error:`, {
      message,
      stack,
      error: err,
    });

    return `<div class="text-red-600 p-4 border border-red-300 rounded">
      <div><strong>${this.getRendererName()} Template Render Error:</strong> ${message}</div>
      ${stack ? `<pre class="mt-2 whitespace-pre-wrap text-sm">${stack}</pre>` : ""}
    </div>`;
  }

  /**
   * Updates the workspace reference (useful for workspace changes)
   */
  updateWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
    // Clear caches when workspace changes
    this.markdownCache.clear();
  }

  /**
   * Abstract method to get the renderer name for error messages
   */
  protected abstract getRendererName(): string;

  /**
   * Abstract method for rendering template strings
   */
  abstract renderString(templateContent: string, data: any): string;

  /**
   * Abstract method for rendering template files
   */
  abstract renderTemplate(templatePath: AbsPath, data: any): Promise<string>;
}

/**
 * Core helper function implementations - DRY principle applied
 */
export const HelperCore = {
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
};

/**
 * ETA-style helpers (direct function calls)
 */
export const SharedHelpers = HelperCore;

/**
 * Utility to wrap core helper functions as Mustache lambdas
 * This eliminates repetition between ETA and Mustache helper implementations
 */
export const createMustacheLambda = {
  // String helpers that need render context
  stringHelper:
    (helperFn: (str: string, ...args: any[]) => string, ...args: any[]) =>
    () =>
    (text: string, render: (template: string) => string) => {
      const rendered = render(text);
      return helperFn(rendered, ...args);
    },

  // String helpers with parameters
  stringHelperWithParams:
    (helperFn: (str: string, ...args: any[]) => string) =>
    (...args: any[]) =>
    (text: string, render: (template: string) => string) => {
      const rendered = render(text);
      return helperFn(rendered, ...args);
    },

  // Array helpers
  arrayHelper:
    (helperFn: (arr: any[], ...args: any[]) => any, ...args: any[]) =>
    () =>
    (arr: any[]) =>
      helperFn(arr, ...args),

  // Array helpers with parameters
  arrayHelperWithParams:
    (helperFn: (arr: any[], ...args: any[]) => any) =>
    (...args: any[]) =>
    (arr: any[]) =>
      helperFn(arr, ...args),

  // Date helpers
  dateHelper:
    (helperFn: (date: Date | string, ...args: any[]) => string) =>
    (...args: any[]) =>
    (date: Date | string, render: (template: string) => string) => {
      const dateValue = date instanceof Date ? date : new Date(render(String(date)));
      return helperFn(dateValue, ...args);
    },

  // Simple function wrappers (no render context needed)
  simpleHelper:
    (helperFn: (...args: any[]) => any, ...args: any[]) =>
    () =>
    (...callArgs: any[]) =>
      helperFn(...args, ...callArgs),

  // Parameterized simple helpers
  simpleHelperWithParams:
    (helperFn: (...args: any[]) => any) =>
    (...args: any[]) =>
    (...callArgs: any[]) =>
      helperFn(...args, ...callArgs),
};
