import { DefaultFile } from "@/lib/DefaultFile";
import { Workspace } from "@/lib/events/Workspace";
import { AbsPath, isEjs, isMustache } from "@/lib/paths2";
import { BaseRenderer } from "./BaseRenderer";
import { EtaRenderer, TemplateData } from "./EtaRenderer";
import { HtmlRenderer, HtmlTemplateData } from "./HtmlRenderer";
import { MustacheRenderer, MustacheTemplateData } from "./MustacheRenderer";

type TemplateType = "ejs" | "mustache" | "html";

export class TemplateManager {
  static canHandleFile(path: AbsPath): boolean {
    return isEjs(path) || isMustache(path) || path.endsWith(".html");
  }

  private renderers: Record<TemplateType, BaseRenderer>;
  private workspace: Workspace;

  constructor(workspace: Workspace) {
    this.workspace = workspace;
    this.renderers = {
      ejs: new EtaRenderer(workspace), // EJS and .eta files both use ETA renderer internally
      mustache: new MustacheRenderer(workspace),
      html: new HtmlRenderer(workspace), // HTML stub renderer (no templating)
    };
  }

  /**
   * Gets the template type from file path
   */
  private getTemplateType(templatePath: AbsPath): TemplateType {
    if (templatePath.endsWith(".mustache")) return "mustache";
    if (templatePath.endsWith(".ejs") || templatePath.endsWith(".eta")) return "ejs";
    if (templatePath.endsWith(".html")) return "html";

    // Default fallback
    return "html";
  }

  /**
   * Gets the appropriate renderer for a template path
   */
  private getRenderer(templatePath: AbsPath): BaseRenderer {
    const templateType = this.getTemplateType(templatePath);
    return this.renderers[templateType];
  }

  /**
   * Renders a template file with live data from workspace
   */
  async renderTemplate(
    templatePath: AbsPath,
    customData: TemplateData | MustacheTemplateData | HtmlTemplateData = {}
  ): Promise<string> {
    try {
      const renderer = this.getRenderer(templatePath);
      return await renderer.renderTemplate(templatePath, customData);
    } catch (error) {
      console.error("Template rendering error:", error);
      const renderer = this.getRenderer(templatePath);
      return renderer.formatError(error);
    }
  }

  /**
   * Renders a template string directly
   */
  renderString(
    templateContent: string,
    customData: TemplateData | MustacheTemplateData | HtmlTemplateData = {},
    templateType: TemplateType = "html"
  ): string {
    const renderer = this.renderers[templateType];
    return renderer.renderString(templateContent, customData);
  }

  /**
   * Renders a template with markdown import support (EJS only)
   */
  async renderTemplateWithMarkdown(
    templatePath: AbsPath,
    customData: TemplateData = {},
    markdownPaths: string[] = []
  ): Promise<string> {
    try {
      const renderer = this.getRenderer(templatePath);
      const templateType = this.getTemplateType(templatePath);

      if (templateType === "mustache" || templateType === "html") {
        // Mustache and HTML don't support markdown imports, fallback to regular rendering
        return await renderer.renderTemplate(templatePath, customData);
      } else {
        // For EJS templates, use renderWithMarkdown to support markdown imports
        const templateContent = await this.workspace.readFile(templatePath);
        const content = String(templateContent);
        return await (renderer as EtaRenderer).renderWithMarkdown(content, customData, markdownPaths);
      }
    } catch (error) {
      console.error("Template rendering error:", error);
      const renderer = this.getRenderer(templatePath);
      return renderer.formatError(error);
    }
  }

  /**
   * Renders a template string with markdown import support (EJS only)
   */
  async renderStringWithMarkdown(
    templateContent: string,
    customData: TemplateData = {},
    markdownPaths: string[] = [],
    templateType: TemplateType = "html"
  ): Promise<string> {
    try {
      const renderer = this.renderers[templateType];

      if (templateType === "mustache" || templateType === "html") {
        // Mustache and HTML don't support markdown imports, fallback to regular rendering
        return renderer.renderString(templateContent, customData);
      } else {
        return await (renderer as EtaRenderer).renderWithMarkdown(templateContent, customData, markdownPaths);
      }
    } catch (error) {
      console.error("Template rendering error:", error);
      const renderer = this.renderers[templateType];
      return renderer.formatError(error);
    }
  }

  /**
   * Gets all template files in the workspace
   */
  getTemplateFiles(): AbsPath[] {
    const allNodes = this.workspace.getFileTree().all();
    return allNodes
      .filter(
        (node) =>
          node.type === "file" &&
          (node.path.endsWith(".eta") ||
            node.path.endsWith(".ejs") ||
            node.path.endsWith(".mustache") ||
            node.path.endsWith(".html"))
      )
      .map((node) => node.path);
  }

  /**
   * Creates a new template file with default content
   */
  async createTemplate(templatePath: AbsPath, content?: string): Promise<AbsPath> {
    const defaultContent = content || DefaultFile.fromPath(templatePath);
    return await this.workspace.newFile(
      templatePath.split("/").slice(0, -1).join("/") as AbsPath,
      templatePath.split("/").pop() as any,
      defaultContent
    );
  }

  /**
   * Updates the workspace reference
   */
  updateWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
    Object.values(this.renderers).forEach((renderer) => renderer.updateWorkspace(workspace));
  }
}
