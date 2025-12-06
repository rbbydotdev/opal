import { useLiveFileContent } from "@/context/useFileContents";
import { ExtCtxReadyContext, PreviewContext } from "@/features/live-preview/IframeContextProvider";
import { TemplateManager } from "@/features/templating";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown, isMustache, isTemplateType, prefix, relPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useEffect, useRef, useState } from "react";

// Reusable hook for render body callback
function useRenderBodyCallback(onRenderBodyReady?: (element: HTMLElement) => void, trigger?: any) {
  const renderBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renderBodyRef.current && onRenderBodyReady) {
      onRenderBodyReady(renderBodyRef.current);
    }
  }, [trigger, onRenderBodyReady]);

  return renderBodyRef;
}

// Reusable component for render body container
function RenderBodyContainer({
  html,
  renderBodyRef,
  mode = "external",
}: {
  html: string;
  renderBodyRef: React.RefObject<HTMLDivElement | null>;
  mode?: "pane" | "external";
}) {
  return (
    <div
      ref={renderBodyRef}
      id="render-body"
      style={mode === "pane" ? { width: "100%", height: "100%", overflow: "auto" } : {}}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const getBaseHref = (href: string): string => href.split("?")[0]!;

// Shared CSS injection logic with smooth transitions
export function injectCssFiles(context: ExtCtxReadyContext, cssFiles: string[]): void {
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
  onRenderBodyReady,
  mode = "external",
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  context: PreviewContext;
  onRenderBodyReady?: (element: HTMLElement) => void;
  mode: "pane" | "external";
}) {
  if (isMarkdown(path)) {
    return (
      <MarkdownRenderer
        mode={mode}
        path={path}
        currentWorkspace={currentWorkspace}
        context={context}
        onRenderBodyReady={onRenderBodyReady}
      />
    );
  }

  if (isImage(path)) {
    return <img src={path} alt="Preview" style={{ maxWidth: "100%", height: "auto" }} />;
  }

  if (isMustache(path) || isEjs(path)) {
    return (
      <TemplateRenderer
        mode={mode}
        path={path}
        currentWorkspace={currentWorkspace}
        onRenderBodyReady={onRenderBodyReady}
      />
    );
  }

  if (isHtml(path)) {
    return (
      <HtmlRenderer mode={mode} path={path} currentWorkspace={currentWorkspace} onRenderBodyReady={onRenderBodyReady} />
    );
  }

  return <div>Unsupported file type for preview: {path}</div>;
}

function MarkdownRenderer({
  path,
  currentWorkspace,
  onRenderBodyReady,
  mode = "external",
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  context: PreviewContext;
  onRenderBodyReady?: (element: HTMLElement) => void;
  mode?: "pane" | "external";
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");
  const renderBodyRef = useRenderBodyCallback(onRenderBodyReady, html);

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

  return <RenderBodyContainer mode={mode} html={html} renderBodyRef={renderBodyRef} />;
}

function TemplateRenderer({
  path,
  currentWorkspace,
  onRenderBodyReady,
  mode,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  onRenderBodyReady?: (element: HTMLElement) => void;
  mode: "pane" | "external";
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const [html, setHtml] = useState<string>("");
  const renderBodyRef = useRenderBodyCallback(onRenderBodyReady, html);

  useEffect(() => {
    const renderTemplate = async () => {
      try {
        const templateManager = new TemplateManager(currentWorkspace);
        const templateType = getMimeType(path);
        if (!isTemplateType(templateType)) {
          throw new Error(`Unsupported template type: ${templateType}`);
        }

        const rendered = await templateManager.renderStringWithMarkdown(
          content || "",
          {
            date: new Date(),
            data: {
              title: `${currentWorkspace.name} ${relPath(path)}`,
              name: `${prefix(path)}`,
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

  return <RenderBodyContainer mode={mode} html={html} renderBodyRef={renderBodyRef} />;
}

function HtmlRenderer({
  path,
  currentWorkspace,
  onRenderBodyReady,
  mode,
}: {
  path: AbsPath;
  currentWorkspace: Workspace;
  onRenderBodyReady?: (element: HTMLElement) => void;
  mode: "pane" | "external";
}) {
  const content = useLiveFileContent(currentWorkspace, path);
  const renderBodyRef = useRenderBodyCallback(onRenderBodyReady, content);

  return <RenderBodyContainer mode={mode} html={content || ""} renderBodyRef={renderBodyRef} />;
}
