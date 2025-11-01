import { PreviewContext } from "@/app/IframeContextProvider2";
import { useLiveFileContent } from "@/context/useFileContents";
import { Workspace } from "@/data/Workspace";
import { TemplateManager } from "@/features/templating";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown, isMustache } from "@/lib/paths2";
import { useEffect, useState } from "react";

// Shared CSS injection logic
export function injectCssFiles(context: PreviewContext, cssFiles: string[]): void {
  // Remove existing preview CSS
  const existingLinks = context.document?.head?.querySelectorAll('link[data-preview-css="true"]');
  existingLinks?.forEach((link) => link.remove());

  // Add new CSS files
  cssFiles.forEach((cssFile) => {
    const link = context?.document?.createElement("link");
    if (link) {
      link.rel = "stylesheet";
      link.href = cssFile;
      link.setAttribute("data-preview-css", "true");
      context.document?.head.appendChild(link);
    }
  });
}

export function PreviewContent({
  path,
  currentWorkspace,
  context,
  onContentLoaded,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  context: PreviewContext;
  onContentLoaded?: () => void;
}) {
  if (isMarkdown(path)) {
    return (
      <MarkdownRenderer
        path={path}
        currentWorkspace={currentWorkspace}
        context={context}
        onContentLoaded={onContentLoaded}
      />
    );
  }

  if (isImage(path)) {
    return (
      <img src={path} alt="Preview" style={{ maxWidth: "100%", height: "auto" }} onLoad={() => onContentLoaded?.()} />
    );
  }

  if (isMustache(path) || isEjs(path)) {
    return <TemplateRenderer path={path} currentWorkspace={currentWorkspace} onContentLoaded={onContentLoaded} />;
  }

  if (isHtml(path)) {
    return <HtmlRenderer path={path} currentWorkspace={currentWorkspace} onContentLoaded={onContentLoaded} />;
  }

  // Call onContentLoaded for unsupported files too
  useEffect(() => {
    onContentLoaded?.();
  }, [onContentLoaded]);

  return <div>Unsupported file type for preview: {path}</div>;
}

// Shared renderer components
function MarkdownRenderer({
  path,
  currentWorkspace,
  onContentLoaded,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  context: PreviewContext;
  onContentLoaded?: () => void;
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    try {
      const markdownContent = stripFrontmatter(content || "");
      const renderedHtml = renderMarkdownToHtml(markdownContent);
      setHtml(renderedHtml);
      // Call onContentLoaded after a brief delay to ensure DOM is updated
      // setTimeout(() => onContentLoaded?.(), 50);
    } catch (error) {
      console.error("Error rendering markdown:", error);
      setHtml('<div style="color: red; padding: 16px;">Error rendering markdown</div>');
      setTimeout(() => onContentLoaded?.(), 50);
    }
  }, [content, onContentLoaded]);

  return <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function TemplateRenderer({
  path,
  currentWorkspace,
  onContentLoaded,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  onContentLoaded?: () => void;
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    const renderTemplate = async () => {
      try {
        const templateManager = new TemplateManager(currentWorkspace);
        const templateType = isMustache(path) ? "mustache" : isEjs(path) ? "ejs" : "html";

        const rendered = await templateManager.renderStringWithMarkdown(
          content || "",
          {
            date: new Date(),
            data: {
              title: "Preview",
              name: "User",
            },
          },
          [],
          templateType
        );
        setHtml(rendered);
        setTimeout(() => onContentLoaded?.(), 50);
      } catch (error) {
        console.error("Template render error:", error);
        const err = error as Error;
        const message = err.message || String(err);
        const stack = err.stack || "";
        setHtml(`<div style="color: rgb(220, 38, 38); padding: 16px; border: 1px solid rgb(252, 165, 165); border-radius: 8px;">
          <div><strong>Template Render Error:</strong> ${message}</div>
          ${stack ? `<pre style="margin-top: 8px; white-space: pre-wrap; font-size: 14px;">${stack}</pre>` : ""}
        </div>`);
        setTimeout(() => onContentLoaded?.(), 50);
      }
    };

    void renderTemplate();
  }, [content, path, currentWorkspace, onContentLoaded]);

  return <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function HtmlRenderer({
  path,
  currentWorkspace,
  onContentLoaded,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  onContentLoaded?: () => void;
}) {
  const content = useLiveFileContent(currentWorkspace, path);

  useEffect(() => {
    // Call onContentLoaded when content changes
    setTimeout(() => onContentLoaded?.(), 50);
  }, [content, onContentLoaded]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
