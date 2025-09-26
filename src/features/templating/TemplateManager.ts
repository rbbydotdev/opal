import { Workspace } from "@/Db/Workspace";
import { AbsPath } from "@/lib/paths2";
import { EtaRenderer, TemplateData } from "./EtaRenderer";

/**
 * Manages template rendering for a workspace with support for live editing
 */
export class TemplateManager {
  private renderer: EtaRenderer;
  private workspace: Workspace;

  constructor(workspace: Workspace) {
    this.workspace = workspace;
    this.renderer = new EtaRenderer(workspace);
  }

  /**
   * Renders a template file with live data from workspace
   */
  async renderTemplate(templatePath: AbsPath, customData: TemplateData = {}): Promise<string> {
    try {
      // Read the main template
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);

      // Use renderWithIncludes to support template includes
      return await this.renderer.renderWithIncludes(content, customData);
    } catch (error) {
      console.error('Template rendering error:', error);
      return this.renderer.formatError ? 
        this.renderer.formatError(error) : 
        `<div class="text-red-600">Template Error: ${error}</div>`;
    }
  }

  /**
   * Renders a template string directly
   */
  renderString(templateContent: string, customData: TemplateData = {}): string {
    return this.renderer.renderString(templateContent, customData);
  }

  /**
   * Renders a template with markdown import support
   */
  async renderTemplateWithMarkdown(templatePath: AbsPath, customData: TemplateData = {}, markdownPaths: string[] = []): Promise<string> {
    try {
      // Read the main template
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);

      // Use renderWithMarkdown to support markdown imports
      return await this.renderer.renderWithMarkdown(content, customData, markdownPaths);
    } catch (error) {
      console.error('Template rendering error:', error);
      return this.renderer.formatError ? 
        this.renderer.formatError(error) : 
        `<div class="text-red-600">Template Error: ${error}</div>`;
    }
  }

  /**
   * Renders a template string with markdown import support
   */
  async renderStringWithMarkdown(templateContent: string, customData: TemplateData = {}, markdownPaths: string[] = []): Promise<string> {
    try {
      return await this.renderer.renderWithMarkdown(templateContent, customData, markdownPaths);
    } catch (error) {
      console.error('Template rendering error:', error);
      return this.renderer.formatError ? 
        this.renderer.formatError(error) : 
        `<div class="text-red-600">Template Error: ${error}</div>`;
    }
  }

  /**
   * Gets all template files in the workspace
   */
  getTemplateFiles(): AbsPath[] {
    const allNodes = this.workspace.getFileTree().all();
    return allNodes
      .filter(node => node.type === 'file' && (
        node.path.endsWith('.eta') || 
        node.path.endsWith('.ejs') ||
        node.path.endsWith('.html')
      ))
      .map(node => node.path);
  }

  /**
   * Creates a new template file with default content
   */
  async createTemplate(templatePath: AbsPath, content?: string): Promise<AbsPath> {
    const defaultContent = content || this.getDefaultTemplateContent();
    return await this.workspace.newFile(
      templatePath.split('/').slice(0, -1).join('/') as AbsPath,
      templatePath.split('/').pop() as any,
      defaultContent
    );
  }

  /**
   * Gets default template content
   */
  private getDefaultTemplateContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= it.data?.title || 'Document' %></title>
</head>
<body>
    <h1>Hello <%= it.data?.name || 'World' %>!</h1>
    
    <% if (it.images && it.images.length > 0) { %>
    <h2>Images:</h2>
    <div class="image-gallery">
    <% it.images.forEach(function(img) { %>
        <img src="<%= img.url %>" alt="<%= img.name %>" style="max-width: 200px; margin: 10px;">
    <% }); %>
    </div>
    <% } %>
    
    <% if (it.fileTree && it.fileTree.length > 0) { %>
    <h2>Files in workspace:</h2>
    <ul>
    <% it.fileTree.forEach(function(file) { %>
        <li><%= file.name %> (<%= file.type %>)</li>
    <% }); %>
    </ul>
    <% } %>
</body>
</html>`;
  }

  /**
   * Updates the workspace reference
   */
  updateWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
    this.renderer.updateWorkspace(workspace);
  }
}