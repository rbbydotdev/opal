import { Workspace } from "@/Db/Workspace";
import { AbsPath, isImage } from "@/lib/paths2";
import { Eta } from "eta";

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
  [key: string]: any;
}

export class EtaRenderer {
  private eta: Eta;
  private workspace: Workspace;
  private templateCache: Map<string, string> = new Map();

  constructor(workspace: Workspace) {
    this.workspace = workspace;
    this.eta = new Eta({
      cache: false, // Disable cache for live editing
      autoEscape: false, // Allow HTML output
    });

    // Set up custom file reader to read from workspace filesystem
    this.eta.readFile = this.readTemplateFromWorkspace.bind(this);
    this.eta.resolvePath = this.resolveTemplatePath.bind(this);
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
   * Renders a template file from the workspace
   */
  async renderTemplate(templatePath: AbsPath, data: TemplateData = {}): Promise<string> {
    try {
      const templateContent = await this.workspace.readFile(templatePath);
      return this.renderString(String(templateContent), data);
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
      const includePaths = includeMatches.map(match => {
        const pathMatch = match.match(/include\(['"`]([^'"`]+)['"`]/);
        return pathMatch ? this.resolveTemplatePath(pathMatch[1]) : null;
      }).filter((path): path is string => path !== null);

      // Preload all included templates
      await this.preloadTemplates(includePaths as AbsPath[]);
    }

    return this.renderString(templateContent, data);
  }

  /**
   * Enriches template data with workspace-specific information
   */
  private enrichTemplateData(data: TemplateData): TemplateData {
    return {
      ...data,
      images: data.images || this.getWorkspaceImages(),
      fileTree: data.fileTree || this.getWorkspaceFileTree(),
      // Add workspace-specific helpers
      workspace: {
        name: this.workspace.name,
        id: this.workspace.id,
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
      name: path.split('/').pop() || '',
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
    if (template.startsWith('./') || template.startsWith('../')) {
      // For now, resolve relative to root
      const resolvedPath = template.replace(/^\.\//, '/');
      return resolvedPath as AbsPath;
    }
    
    // Handle absolute paths
    if (template.startsWith('/')) {
      return template as AbsPath;
    }
    
    // Default to adding .eta extension if no extension provided
    const hasExtension = template.includes('.');
    return (hasExtension ? template : `${template}.eta`) as AbsPath;
  }

  /**
   * Formats errors for display in the template
   */
  formatError(error: unknown): string {
    const err = error as Error;
    const message = err.message || String(err);
    const stack = err.stack || "";
    
    return `<div class="text-red-600 p-4 border border-red-300 rounded">
      <div><strong>Template Render Error:</strong> ${message}</div>
      ${stack ? `<pre class="mt-2 whitespace-pre-wrap text-sm">${stack}</pre>` : ""}
    </div>`;
  }

  /**
   * Updates the workspace reference (useful for workspace changes)
   */
  updateWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
  }
}