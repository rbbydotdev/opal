import { useLiveFileContent } from "@/data/useFileContents";
import { PreviewContext } from "@/features/live-preview/IframeContextProvider";
import { useRenderBodyCallback } from "@/features/live-preview/useRenderBodyCallback";
import { TemplateManager } from "@/features/templating";
import { stripFrontmatter } from "@/lib/markdown/frontMatter";
import { renderMarkdownToHtml } from "@/lib/markdown/renderMarkdownToHtml";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, isEjs, isHtml, isImage, isMarkdown, isMustache, isNunchucks, isLiquid, isTemplateFile, isTemplateType, prefix, relPath } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useEffect, useState } from "react";

import React, { useMemo, useRef } from "react";

function RenderBodyContainer({
  html,
  renderBodyRef,
  mode = "external",
}: {
  html: string;
  renderBodyRef: React.RefObject<HTMLDivElement | null>;
  mode?: "pane" | "external";
}) {
  const stableHtmlRef = useRef<string | null>(null);

  if (mode === "external") {
    if (html && !stableHtmlRef.current) {
      stableHtmlRef.current = html;
    }
    if (!html && stableHtmlRef.current) {
      html = stableHtmlRef.current;
    }
  }

  const style = useMemo(() => (mode === "pane" ? { width: "100%", height: "100%", overflow: "auto" } : {}), [mode]);

  return <div ref={renderBodyRef} id="render-body" style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default React.memo(RenderBodyContainer);

export const getBaseHref = (href: string): string => href.split("?")[0]!;

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

  if (isTemplateFile(path)) {
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
  const [html, setHtml] = useState<string | null>(null);
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
  if (html === null) return null;

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
  const [html, setHtml] = useState<string | null>(null);
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
        const err = error as Error;
        const message = err.message || String(err);
        const stack = err.stack || "";
        setHtml(/*html*/ `<div style="color: rgb(220, 38, 38); padding: 16px; border: 1px solid rgb(252, 165, 165); border-radius: 8px;">
          <div><strong>Template Render Error:</strong> ${message}</div>
          ${stack ? `<pre style="margin-top: 8px; white-space: pre-wrap; font-size: 14px;">${stack}</pre>` : ""}
        </div>`);
      }
    };

    void renderTemplate();
  }, [content, path, currentWorkspace]);

  if (html === null) return null;
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

  if (content === null) {
    return <div>Loading...</div>;
  }
  return <RenderBodyContainer mode={mode} html={content || ""} renderBodyRef={renderBodyRef} />;
}
