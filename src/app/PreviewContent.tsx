import { IframeReadyContext, PreviewContext } from "@/app/IframeContextProvider2";
import { useLiveFileContent } from "@/context/useFileContents";
import { Workspace } from "@/data/Workspace";
import { TemplateManager } from "@/features/templating";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown, isMustache } from "@/lib/paths2";
import { useEffect, useState } from "react";

const getBaseHref = (href: string): string => href.split("?")[0]!;

// Shared CSS injection logic with smooth transitions
export function injectCssFiles(context: IframeReadyContext, cssFiles: string[]): void {
  const head = context.document.head;

  const newBaseHrefs = new Set(cssFiles.map(getBaseHref));

  // Step 1: Add or swap links with smooth transitions
  cssFiles.forEach((newHref) => {
    const baseHref = getBaseHref(newHref);
    // Find ALL links for this base href (there might be multiple cache-busted versions)
    const existingLinks = head.querySelectorAll<HTMLLinkElement>(`link[data-preview-css="${baseHref}"]`);

    // Check if we already have this exact href
    const exactMatch = Array.from(existingLinks).find((link) => link.href === newHref);

    if (exactMatch) {
      // We already have this exact CSS file, no need to do anything
      return;
    }

    if (existingLinks.length === 0) {
      // New CSS file - just add it
      const newLink = context.document.createElement("link");
      newLink.rel = "stylesheet";
      newLink.href = newHref;
      newLink.setAttribute("data-preview-css", baseHref);
      head.appendChild(newLink);
    } else {
      // CSS file changed - smooth transition and remove ALL old versions
      const newLink = context.document.createElement("link");
      newLink.rel = "stylesheet";
      newLink.href = newHref;
      newLink.setAttribute("data-preview-css", baseHref);

      const handleLoadOrError = () => {
        // Remove ALL old versions of this CSS file
        existingLinks.forEach((oldLink) => {
          oldLink.remove();
        });
        newLink.removeEventListener("load", handleLoadOrError);
        newLink.removeEventListener("error", handleLoadOrError);
      };

      newLink.addEventListener("load", handleLoadOrError);
      newLink.addEventListener("error", handleLoadOrError);
      head.appendChild(newLink);
    }
  });

  // Step 2: Clean up links for CSS files that are no longer needed
  const existingLinks = head.querySelectorAll<HTMLLinkElement>("link[data-preview-css]");
  existingLinks.forEach((link) => {
    const managedHref = link.getAttribute("data-preview-css");
    if (managedHref && !newBaseHrefs.has(managedHref)) {
      link.remove();
    }
  });
}

export function PreviewContent({
  path,
  currentWorkspace,
  context,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  context: PreviewContext;
}) {
  if (isMarkdown(path)) {
    return <MarkdownRenderer path={path} currentWorkspace={currentWorkspace} context={context} />;
  }

  if (isImage(path)) {
    return <img src={path} alt="Preview" style={{ maxWidth: "100%", height: "auto" }} />;
  }

  if (isMustache(path) || isEjs(path)) {
    return <TemplateRenderer path={path} currentWorkspace={currentWorkspace} />;
  }

  if (isHtml(path)) {
    return <HtmlRenderer path={path} currentWorkspace={currentWorkspace} />;
  }

  return <div>Unsupported file type for preview: {path}</div>;
}

// Shared renderer components
function MarkdownRenderer({
  path,
  currentWorkspace,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  context: PreviewContext;
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    try {
      const markdownContent = stripFrontmatter(content || "");
      const renderedHtml = renderMarkdownToHtml(markdownContent);
      setHtml(renderedHtml);
    } catch (error) {
      console.error("Error rendering markdown:", error);
      setHtml('<div style="color: red; padding: 16px;">Error rendering markdown</div>');
    }
  }, [content]);

  return <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function TemplateRenderer({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
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
      } catch (error) {
        console.error("Template render error:", error);
        const err = error as Error;
        const message = err.message || String(err);
        const stack = err.stack || "";
        setHtml(`<div style="color: rgb(220, 38, 38); padding: 16px; border: 1px solid rgb(252, 165, 165); border-radius: 8px;">
          <div><strong>Template Render Error:</strong> ${message}</div>
          ${stack ? `<pre style="margin-top: 8px; white-space: pre-wrap; font-size: 14px;">${stack}</pre>` : ""}
        </div>`);
      }
    };

    void renderTemplate();
  }, [content, path, currentWorkspace]);

  return <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function HtmlRenderer({ path, currentWorkspace }: { path: AbsPath; currentWorkspace: Workspace }) {
  const content = useLiveFileContent(currentWorkspace, path);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }} dangerouslySetInnerHTML={{ __html: content }} />
  );
}
