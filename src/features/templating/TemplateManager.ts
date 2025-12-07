import { DefaultFile } from "@/lib/DefaultFile";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, isEjs, isMustache, isTemplateType, TemplateType } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { BaseRenderer } from "./BaseRenderer";
import { EtaRenderer, TemplateData } from "./EtaRenderer";
import { HtmlRenderer, HtmlTemplateData } from "./HtmlRenderer";
import { MustacheRenderer, MustacheTemplateData } from "./MustacheRenderer";

export class TemplateManager {
  static canHandleFile(path: AbsPath): boolean {
    return isEjs(path) || isMustache(path) || path.endsWith(".html");
  }

  private renderers: Record<TemplateType, BaseRenderer>;
  private workspace: Workspace;

  constructor(workspace: Workspace) {
    this.workspace = workspace;
    this.renderers = {
      "text/x-ejs": new EtaRenderer(workspace), // EJS and .eta files both use ETA renderer internally
      "text/x-mustache": new MustacheRenderer(workspace),
      "text/html": new HtmlRenderer(workspace), // HTML stub renderer (no templating)
    };
  }

  private getRenderer(templatePath: AbsPath): BaseRenderer {
    const templateType = getMimeType(templatePath);
    if (!isTemplateType(templateType)) {
      throw new Error(`Unsupported template type: ${templateType}`);
    }
    return this.renderers[templateType];
  }

  async renderTemplate(
    templatePath: AbsPath,
    customData: TemplateData | MustacheTemplateData | HtmlTemplateData = {}
  ): Promise<string> {
    try {
      const renderer = this.getRenderer(templatePath);
      return await renderer.renderTemplate(templatePath, customData);
    } catch (error) {
      logger.error("Template rendering error:", error);
      const renderer = this.getRenderer(templatePath);
      return renderer.formatError(error);
    }
  }

  renderString(
    templateContent: string,
    customData: TemplateData | MustacheTemplateData | HtmlTemplateData = {},
    templateType: TemplateType = "text/html"
  ): string {
    const renderer = this.renderers[templateType];
    return renderer.renderString(templateContent, customData);
  }

  async renderTemplateWithMarkdown(
    templatePath: AbsPath,
    customData: TemplateData = {},
    markdownPaths: string[] = []
  ): Promise<string> {
    try {
      const renderer = this.getRenderer(templatePath);
      const templateType = getMimeType(templatePath);

      if (templateType === "text/x-mustache" || templateType === "text/html") {
        // Mustache and HTML don't support markdown imports, fallback to regular rendering
        return await renderer.renderTemplate(templatePath, customData);
      } else {
        // For EJS templates, use renderWithMarkdown to support markdown imports
        const templateContent = await this.workspace.readFile(templatePath);
        const content = String(templateContent);
        return await (renderer as EtaRenderer).renderWithMarkdown(content, customData, markdownPaths);
      }
    } catch (error) {
      logger.error("Template rendering error:", error);
      const renderer = this.getRenderer(templatePath);
      return renderer.formatError(error);
    }
  }

  async renderStringWithMarkdown(
    templateContent: string,
    customData: TemplateData = {},
    markdownPaths: string[] = [],
    templateType: TemplateType = "text/html"
  ): Promise<string> {
    try {
      const renderer = this.renderers[templateType];

      if (templateType === "text/x-mustache" || templateType === "text/html") {
        // Mustache and HTML don't support markdown imports, fallback to regular rendering
        return renderer.renderString(templateContent, customData);
      } else {
        return await (renderer as EtaRenderer).renderWithMarkdown(templateContent, customData, markdownPaths);
      }
    } catch (error) {
      logger.error("Template rendering error:", error);
      const renderer = this.renderers[templateType];
      return renderer.formatError(error);
    }
  }

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

  async createTemplate(templatePath: AbsPath, content?: string): Promise<AbsPath> {
    const defaultContent = content || DefaultFile.fromPath(templatePath);
    return await this.workspace.newFile(
      templatePath.split("/").slice(0, -1).join("/") as AbsPath,
      templatePath.split("/").pop() as any,
      defaultContent
    );
  }

  updateWorkspace(workspace: Workspace): void {
    this.workspace = workspace;
    Object.values(this.renderers).forEach((renderer) => renderer.updateWorkspace(workspace));
  }
}
