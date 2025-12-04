import { Workspace } from "@/lib/events/Workspace";
import { AbsPath } from "@/lib/paths2";
import { BaseRenderer } from "./BaseRenderer";

export interface HtmlTemplateData {
  [key: string]: any;
}

export class HtmlRenderer extends BaseRenderer {
  constructor(workspace: Workspace) {
    super(workspace);
  }

  protected getRendererName(): string {
    return "HTML";
  }

  /**
   * Renders HTML content as-is (no templating)
   */
  renderString(templateContent: string, data: HtmlTemplateData = {}): string {
    // HTML renderer is a stub - just return the content unchanged
    return templateContent;
  }

  /**
   * Renders an HTML file from the workspace (no templating)
   */
  async renderTemplate(templatePath: AbsPath, data: HtmlTemplateData = {}): Promise<string> {
    try {
      const templateContent = await this.workspace.readFile(templatePath);
      const content = String(templateContent);

      // HTML renderer is a stub - just return the content unchanged
      return content;
    } catch (error) {
      return this.formatError(error);
    }
  }
}
